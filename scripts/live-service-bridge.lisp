#!/usr/bin/env -S sbcl --script

(defparameter *script-path*
  (or *load-truename* *compile-file-truename* (truename *default-pathname-defaults*)))

(defparameter *script-dir*
  (make-pathname :directory (pathname-directory *script-path*)
                 :name nil
                 :type nil
                 :defaults *script-path*))

(defparameter *project-root* nil)
(defparameter *bridge-environment* nil)

(defun getenv (name)
  #+sbcl (sb-ext:posix-getenv name)
  #-sbcl nil)

(defun sbcl-agent-symbol (name)
  (or (find-symbol name "SBCL-AGENT")
      (error "Unable to resolve SBCL-AGENT symbol ~A" name)))

(defun sbcl-agent-call (name &rest arguments)
  (apply (symbol-function (sbcl-agent-symbol name)) arguments))

(defun service-data (response)
  (getf response :data))

(defun asdf-call (name &rest arguments)
  (let ((symbol (or (find-symbol name "ASDF")
                    (error "Unable to resolve ASDF symbol ~A" name))))
    (apply (symbol-function symbol) arguments)))

(defun script-arguments ()
  (cdr sb-ext:*posix-argv*))

(defun read-stdin-string ()
  (with-output-to-string (out)
    (loop for line = (read-line *standard-input* nil nil)
          while line
          do (progn
               (write-string line out)
               (terpri out)))))

(defun serve-mode-p (operation)
  (string= operation "--serve"))

(defun project-directory-pathname (project-dir)
  (let ((pathname (pathname project-dir)))
    (if (pathname-name pathname)
        (make-pathname :directory (append (or (pathname-directory pathname) '(:relative))
                                          (list (pathname-name pathname)))
                       :name nil
                       :type nil
                       :defaults pathname)
        pathname)))

(defun file-pathname (path)
  (let ((pathname (pathname path)))
    (if (pathname-name pathname)
        pathname
        (error "Expected a file pathname, got directory-like path ~A" path))))

(defun normalize-symbol-value (value)
  (string-downcase (substitute #\_ #\- (symbol-name value))))

(defun plist-like-p (value)
  (and (listp value)
       (evenp (length value))
       (loop for (key val) on value by #'cddr
             always (and (keywordp key)
                         (or val t)))))

(defun json-friendly (value)
  (cond
    ((or (null value) (stringp value) (numberp value) (eq value t))
     value)
    ((keywordp value)
     (normalize-symbol-value value))
    ((symbolp value)
     (normalize-symbol-value value))
    ((plist-like-p value)
     (loop for (key val) on value by #'cddr
           collect (cons (normalize-symbol-value key)
                         (json-friendly val))))
    ((listp value)
     (mapcar #'json-friendly value))
    (t
     (princ-to-string value))))

(defun json-object-alist-p (value)
  (and (listp value)
       (every (lambda (entry)
                (and (consp entry)
                     (stringp (car entry))))
              value)))

(defun emit-request-json-string (value)
  (cond
    ((json-object-alist-p value)
     (with-output-to-string (out)
       (write-char #\{ out)
       (loop for entry in value
             for first = t then nil
             do (unless first
                  (write-char #\, out))
                (write-string (sbcl-agent-call "EMIT-JSON" (car entry)) out)
                (write-char #\: out)
                (write-string (emit-request-json-string (cdr entry)) out))
       (write-char #\} out)))
    ((listp value)
     (with-output-to-string (out)
       (write-char #\[ out)
       (loop for entry in value
             for first = t then nil
             do (unless first
                  (write-char #\, out))
                (write-string (emit-request-json-string entry) out))
       (write-char #\] out)))
    (t
     (sbcl-agent-call "EMIT-JSON" value))))

(defun meaningful-environment-id-p (environment-id)
  (and (stringp environment-id)
       (> (length environment-id) 0)
       (not (string= environment-id "live-environment"))))

(defun assert-bridge-environment-match (environment requested-environment-id operation)
  (when (and (meaningful-environment-id-p requested-environment-id)
             (not (string= requested-environment-id
                           (sbcl-agent-call "ENVIRONMENT-ID" environment))))
    (error "Bridge environment mismatch for ~A: requested ~A but persisted ~A"
           operation
           requested-environment-id
           (sbcl-agent-call "ENVIRONMENT-ID" environment))))

(defun binding-transition-operation-p (operation)
  (member operation '("environment.load-image" "environment.revert-image") :test #'string=))

(defun load-or-create-bridge-environment (project-root state-path environment-id)
  (let ((environment (if (probe-file state-path)
                         (handler-case
                             (sbcl-agent-call "LOAD-ENVIRONMENT" state-path)
                           (error (condition)
                             (if (meaningful-environment-id-p environment-id)
                                 (error "Unable to load persisted environment ~A for requested binding ~A: ~A"
                                        state-path
                                        environment-id
                                        condition)
                                 (sbcl-agent-call "MAKE-DEFAULT-ENVIRONMENT"
                                                  :storage-root (namestring project-root)))))
                         (sbcl-agent-call "MAKE-DEFAULT-ENVIRONMENT"
                                          :storage-root (namestring project-root)))))
    (when (and (meaningful-environment-id-p environment-id)
               (not (string= environment-id
                             (sbcl-agent-call "ENVIRONMENT-ID" environment))))
      (setf (symbol-value (sbcl-agent-symbol "*CURRENT-ENVIRONMENT*")) environment)
      (bridge-session environment)
      (bootstrap-desktop-environment environment))
    (setf (symbol-value (sbcl-agent-symbol "*CURRENT-ENVIRONMENT*")) environment)
    (bridge-session environment)
    (bootstrap-desktop-environment environment)))

(defun bridge-session (environment)
  (funcall (sbcl-agent-symbol "ENVIRONMENT-SESSION") environment))

(defun first-approval-requirement (session work-item)
  (let* ((wait (sbcl-agent-call "WORK-ITEM-WAIT-REPORT" session work-item))
         (requirements (getf wait :approval-requirements)))
    (and (listp requirements)
         requirements
         (first requirements))))

(defun plist (&rest entries)
  entries)

(defun desktop-bootstrap-scenario ()
  (or (getenv "SBCL_AGENT_DESKTOP_SCENARIO")
      "default"))

(defun seed-completed-thread (session)
  (let* ((thread (sbcl-agent-call "CREATE-THREAD"
                                  session
                                  :title "Environment Orientation"
                                  :summary "A completed planning conversation anchors the desktop shell."))
         (user-message (sbcl-agent-call "CREATE-MESSAGE"
                                        session
                                        thread
                                        :user
                                        "Summarize the operating posture of this environment."))
         (turn (sbcl-agent-call "START-TURN"
                                session
                                thread
                                user-message))
         (operation (sbcl-agent-call "START-OPERATION"
                                     session
                                     thread
                                     turn
                                     :assistant
                                     "environment-summary"
                                     (plist :intent "orientation"))))
    (sbcl-agent-call "COMPLETE-OPERATION"
                     session
                     thread
                     turn
                     operation
                     (plist :result "Environment posture summarized.")
                     :status :completed)
    (sbcl-agent-call "CREATE-ARTIFACT"
                     session
                     thread
                     turn
                     operation
                     :plan
                     nil
                     :title "Environment Orientation Brief"
                     :summary "Initial orientation brief captured for the desktop shell."
                     :metadata (plist :bootstrap-p t))
    (let ((assistant-message (sbcl-agent-call "CREATE-MESSAGE"
                                              session
                                              thread
                                              :assistant
                                              "The environment is warm, governed, and ready for supervised work."
                                              :turn-id (sbcl-agent-call "TURN-ID" turn))))
      (sbcl-agent-call "COMPLETE-TURN"
                       session
                       thread
                       turn
                       assistant-message
                       :status :completed))))

(defun seed-approval-thread (session &key
                                     (title "Governed Mutation Review")
                                     (summary "A governed mutation remains paused on explicit approval.")
                                     (prompt "Prepare a workspace patch for the desktop attention model.")
                                     (goal "Desktop attention model refinement")
                                     (path "src/renderer/src/App.tsx")
                                     (operation-name "workspace-write")
                                     (policy-id :workspace-write)
                                     (policy-reason "Workspace mutation requires operator approval.")
                                     (approval-reason "Desktop bootstrap seeded a governed write candidate.")
                                     (assistant-content "The patch is prepared and waiting for workspace-write approval."))
  (let* ((thread (sbcl-agent-call "CREATE-THREAD"
                                  session
                                  :title title
                                  :summary summary))
         (user-message (sbcl-agent-call "CREATE-MESSAGE"
                                        session
                                        thread
                                        :user
                                        prompt))
         (turn (sbcl-agent-call "START-TURN"
                                session
                                thread
                                user-message))
         (work-item (sbcl-agent-call "CREATE-WORK-ITEM"
                                     session
                                     goal
                                     :mutation-intent (plist :thread-id (sbcl-agent-call "THREAD-ID" thread)
                                                             :turn-id (sbcl-agent-call "TURN-ID" turn))
                                     :transaction-scope :workspace-mutation))
         (operation (sbcl-agent-call "START-OPERATION"
                                     session
                                     thread
                                     turn
                                     :tool
                                     operation-name
                                     (plist :path path)
                                     :policy-decision (plist :decision :approval-required
                                                             :policy-id policy-id
                                                             :reason policy-reason)
                                     :metadata (plist :work-item-id (sbcl-agent-call "WORK-ITEM-ID" work-item)))))
    (sbcl-agent-call "REQUEST-WORK-ITEM-APPROVAL"
                     session
                     work-item
                     policy-id
                     :reason approval-reason)
    (sbcl-agent-call "COMPLETE-OPERATION"
                     session
                     thread
                     turn
                     operation
                     (plist :wait "approval-required")
                     :status :awaiting-approval)
    (sbcl-agent-call "CREATE-ARTIFACT"
                     session
                     thread
                     turn
                     operation
                     :validation
                     nil
                     :title "Mutation Review Packet"
                     :summary "The planned mutation and its guardrails were captured as evidence."
                     :work-item-id (sbcl-agent-call "WORK-ITEM-ID" work-item)
                     :metadata (plist :bootstrap-p t :policy-id policy-id))
    (let ((assistant-message (sbcl-agent-call "CREATE-MESSAGE"
                                              session
                                              thread
                                              :assistant
                                              assistant-content
                                              :turn-id (sbcl-agent-call "TURN-ID" turn))))
      (sbcl-agent-call "COMPLETE-TURN"
                       session
                       thread
                       turn
                       assistant-message
                       :status :awaiting-approval
                       :metadata (plist :work-item-id (sbcl-agent-call "WORK-ITEM-ID" work-item))))))

(defun seed-additional-approval-thread (session)
  (seed-approval-thread session
                        :title "Governed Source Review"
                        :summary "A source-backed governed mutation is awaiting explicit approval."
                        :prompt "Prepare a source patch for the host transport contract."
                        :goal "Stabilize host transport contract"
                        :path "src/main/live-host-adapter.ts"
                        :operation-name "source-write"
                        :policy-id :workspace-write
                        :policy-reason "Source mutation requires operator approval."
                        :approval-reason "Desktop bootstrap seeded a second governed write candidate."
                        :assistant-content "The source patch is prepared and waiting for workspace-write approval."))

(defun seed-incident-thread (session)
  (let* ((thread (sbcl-agent-call "CREATE-THREAD"
                                  session
                                  :title "Runtime Recovery"
                                  :summary "A runtime failure is preserved as durable recovery work."))
         (user-message (sbcl-agent-call "CREATE-MESSAGE"
                                        session
                                        thread
                                        :user
                                        "Evaluate the runtime hot-reload path and report failure context."))
         (turn (sbcl-agent-call "START-TURN"
                                session
                                thread
                                user-message))
         (work-item (sbcl-agent-call "CREATE-WORK-ITEM"
                                     session
                                     "Runtime reload recovery"
                                     :mutation-intent (plist :thread-id (sbcl-agent-call "THREAD-ID" thread)
                                                             :turn-id (sbcl-agent-call "TURN-ID" turn))
                                     :transaction-scope :runtime-mutation))
         (operation (sbcl-agent-call "START-OPERATION"
                                     session
                                     thread
                                     turn
                                     :runtime
                                     "runtime-reload"
                                     (plist :file "src/main/live-host-adapter.ts")
                                     :metadata (plist :work-item-id (sbcl-agent-call "WORK-ITEM-ID" work-item)
                                                      :recovery-state :inspect-runtime))))
    (sbcl-agent-call "COMPLETE-OPERATION"
                     session
                     thread
                     turn
                     operation
                     (plist :error "Reload interrupted while reconciling runtime state.")
                     :status :interrupted
                     :metadata (plist :recovery-state :inspect-runtime
                                      :interrupted-during-load-p t))
    (sbcl-agent-call "CREATE-INCIDENT"
                     session
                     :runtime-eval-failure
                     "Runtime reload interrupted"
                     "The runtime reload path was interrupted and needs supervised recovery."
                     :thread thread
                     :turn turn
                     :operation operation
                     :work-item work-item
                     :workflow-record (sbcl-agent-call "WORK-ITEM-WORKFLOW-RECORD" session work-item)
                     :condition "Interrupted while reconciling runtime image state."
                     :metadata (plist :bootstrap-p t
                                      :package "SBCL-AGENT-USER"
                                      :condition-summary
                                      (plist :type "SIMPLE-ERROR"
                                             :message "Interrupted while reconciling runtime image state."
                                             :restart-count 2)
                                      :condition-detail
                                      (plist :type "SIMPLE-ERROR"
                                             :message "Interrupted while reconciling runtime image state."
                                             :printed "Interrupted while reconciling runtime image state."
                                             :class "SIMPLE-ERROR"
                                             :restart-count 2)
                                      :restart-suggestions
                                      (list (plist :name "CONTINUE"
                                                   :label "Continue recovery from the current checkpoint")
                                            (plist :name "ABORT"
                                                   :label "Abort and return to governed review"))))
    (sbcl-agent-call "CREATE-ARTIFACT"
                     session
                     thread
                     turn
                     operation
                     :runtime-state
                     nil
                     :title "Runtime Recovery Snapshot"
                     :summary "Recovery evidence captured current runtime package and interrupted operation state."
                     :work-item-id (sbcl-agent-call "WORK-ITEM-ID" work-item)
                     :metadata (plist :bootstrap-p t :recovery-state :inspect-runtime))
    (let ((assistant-message (sbcl-agent-call "CREATE-MESSAGE"
                                              session
                                              thread
                                              :assistant
                                              "The reload was interrupted. Recovery evidence and next actions were captured."
                                              :turn-id (sbcl-agent-call "TURN-ID" turn))))
      (sbcl-agent-call "COMPLETE-TURN"
                       session
                       thread
                       turn
                       assistant-message
                       :status :failed
                       :error-state "Interrupted runtime reload."
                       :metadata (plist :work-item-id (sbcl-agent-call "WORK-ITEM-ID" work-item))))))

(defun seed-interrupted-thread (session)
  (let* ((thread (sbcl-agent-call "CREATE-THREAD"
                                  session
                                  :title "Interrupted Reconciliation"
                                  :summary "A governed reconciliation thread was interrupted and needs supervised continuation."))
         (user-message (sbcl-agent-call "CREATE-MESSAGE"
                                        session
                                        thread
                                        :user
                                        "Reconcile the mutation plan and report the interrupted state."))
         (turn (sbcl-agent-call "START-TURN"
                                session
                                thread
                                user-message))
         (operation (sbcl-agent-call "START-OPERATION"
                                     session
                                     thread
                                     turn
                                     :assistant
                                     "reconcile-mutation-plan"
                                     (plist :intent "reconcile" :mode "governed"))))
    (sbcl-agent-call "COMPLETE-OPERATION"
                     session
                     thread
                     turn
                     operation
                     (plist :summary "Reconciliation was interrupted before closure.")
                     :status :interrupted
                     :metadata (plist :interrupted-during-load-p t))
    (let ((assistant-message (sbcl-agent-call "CREATE-MESSAGE"
                                              session
                                              thread
                                              :assistant
                                              "The reconciliation was interrupted and needs a supervised restart."
                                              :turn-id (sbcl-agent-call "TURN-ID" turn))))
      (sbcl-agent-call "COMPLETE-TURN"
                       session
                       thread
                       turn
                       assistant-message
                       :status :interrupted
                       :error-state "Interrupted governed reconciliation."))))

(defun seed-quarantined-work-item (session)
  (let ((work-item (sbcl-agent-call "CREATE-WORK-ITEM"
                                    session
                                    "Quarantined mutation follow-through"
                                    :transaction-scope :workspace-mutation)))
    (sbcl-agent-call "QUARANTINE-WORK-ITEM"
                     session
                     work-item
                     "Mutation follow-through requires operator review before continuation.")
    work-item))

(defun bootstrap-desktop-environment (environment)
  (let ((session (bridge-session environment)))
    (when (and (zerop (length (or (sbcl-agent-call "AGENT-SESSION-EVENTS" session) '())))
               (zerop (length (or (sbcl-agent-call "AGENT-SESSION-WORK-ITEMS" session) '())))
               (zerop (length (or (sbcl-agent-call "AGENT-SESSION-ARTIFACTS" session) '()))))
      (sbcl-agent-call "UPDATE-SESSION-PLAN"
                       session
                       "Operate from the environment root, keep governed work explicit, and preserve durable evidence.")
      (let ((scenario (string-downcase (desktop-bootstrap-scenario))))
        (cond
          ((string= scenario "approval-heavy")
           (seed-completed-thread session)
           (seed-approval-thread session)
           (seed-additional-approval-thread session))
          ((string= scenario "mixed-pressure")
           (seed-completed-thread session)
           (seed-approval-thread session)
           (seed-additional-approval-thread session)
           (seed-incident-thread session))
          ((string= scenario "thread-work-pressure")
           (seed-completed-thread session)
           (seed-interrupted-thread session)
           (seed-quarantined-work-item session))
          ((string= scenario "calm-evidence")
           (seed-completed-thread session))
          (t
           (seed-completed-thread session)
           (seed-approval-thread session)
           (seed-incident-thread session)))))
    (when (null (service-data (sbcl-agent-call "QUERY-CONVERSATION-THREAD-LIST-SERVICE" session)))
      (seed-completed-thread session))
    environment))

(defun ensure-desktop-conversation-thread-list (session)
  (let ((response (sbcl-agent-call "QUERY-CONVERSATION-THREAD-LIST-SERVICE" session)))
    (when (null (service-data response))
      (seed-completed-thread session)
      (setf response (sbcl-agent-call "QUERY-CONVERSATION-THREAD-LIST-SERVICE" session)))
    response))

(defun request-object (request-json)
  (and request-json
       (sbcl-agent-call "PARSE-JSON" request-json)))

(defun request-object-value (request-json key)
  (let ((object (request-object request-json)))
    (and object
         (sbcl-agent-call "JSON-OBJECT-VALUE" object key))))

(defun request-attachment-plists (request-json key)
  (let ((attachments (request-object-value request-json key)))
    (mapcar (lambda (entry)
              (if (listp entry)
                  (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" entry)
                  entry))
            (if (listp attachments) attachments '()))))

(defun request-record-plist (request-json key)
  (let ((record (request-object-value request-json key)))
    (cond
      ((null record) nil)
      ((listp record)
       (normalize-request-record-value
        (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" record)))
      (t record))))

(defun request-record-list-plists (request-json key)
  (let ((records (request-object-value request-json key)))
    (mapcar (lambda (entry)
              (if (listp entry)
                  (normalize-request-record-value
                   (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" entry))
                  entry))
            (if (listp records) records '()))))

(defun normalize-request-record-value (value)
  (cond
    ((and (stringp value)
          (string= value "null"))
     nil)
    ((plist-like-p value)
     (loop for (key val) on value by #'cddr
           append (list key (normalize-request-record-value val))))
    ((listp value)
     (mapcar #'normalize-request-record-value value))
    (t value)))

(defun emit-json-line (object)
  (write-line (emit-request-json-string (json-friendly object)))
  (finish-output))

(defun emit-stream-frame (type payload)
  (emit-json-line (list :type type :payload payload)))

(defun provider-event-stream-payload (event)
  (list :cursor 0
        :kind :provider-stream
        :timestamp (get-universal-time)
        :family :provider
        :summary (format nil "provider / ~A"
                         (normalize-symbol-value
                          (sbcl-agent-call "PROVIDER-EVENT-EFFECTIVE-TYPE" event)))
        :entity-id (or (sbcl-agent-call "PROVIDER-EVENT-ENTITY-ID" event)
                       (sbcl-agent-call "PROVIDER-EVENT-RUN-ID" event)
                       (sbcl-agent-call "PROVIDER-EVENT-OPERATION-ID" event))
        :thread-id (sbcl-agent-call "PROVIDER-EVENT-THREAD-ID" event)
        :turn-id (sbcl-agent-call "PROVIDER-EVENT-TURN-ID" event)
        :visibility (or (sbcl-agent-call "PROVIDER-EVENT-VISIBILITY" event) :user)
        :payload (list :canonical-type
                       (sbcl-agent-call "PROVIDER-EVENT-EFFECTIVE-TYPE" event)
                       :legacy-type (sbcl-agent-call "PROVIDER-EVENT-LEGACY-TYPE" event)
                       :payload (sbcl-agent-call "PROVIDER-EVENT-PAYLOAD" event)
                       :run-id (sbcl-agent-call "PROVIDER-EVENT-RUN-ID" event)
                       :operation-id (sbcl-agent-call "PROVIDER-EVENT-OPERATION-ID" event)
                       :thread-id (sbcl-agent-call "PROVIDER-EVENT-THREAD-ID" event)
                       :turn-id (sbcl-agent-call "PROVIDER-EVENT-TURN-ID" event))))

(defun last-id (items)
  (car (last items)))

(defun record-conversation-send-failure (session thread-id summary
                                         &key surface-context surface-actions)
  (let* ((thread (and thread-id
                      (sbcl-agent-call "FIND-THREAD" session thread-id)))
         (turn-id (and thread
                       (last-id (sbcl-agent-call "THREAD-TURN-IDS" thread))))
         (turn (and turn-id
                    (sbcl-agent-call "FIND-TURN" session turn-id)))
         (operation-id (and turn
                            (last-id (sbcl-agent-call "TURN-OPERATION-IDS" turn))))
         (operation (and operation-id
                         (sbcl-agent-call "FIND-OPERATION" session operation-id)))
         (assistant-message (and thread turn
                                 (sbcl-agent-call "CREATE-MESSAGE"
                                                  session
                                                  thread
                                                  :assistant
                                                  summary
                                                  :turn-id (sbcl-agent-call "TURN-ID" turn)
                                                  :metadata (plist :source :live-bridge
                                                                   :delivery :error)))))
    (when (and thread turn operation)
      (sbcl-agent-call "COMPLETE-OPERATION"
                       session
                       thread
                       turn
                       operation
                       (plist :error summary)
                       :failed-p t
                       :status :failed
                       :metadata (plist :bridge-error-p t)))
    (when (and thread turn assistant-message)
      (sbcl-agent-call "COMPLETE-TURN"
                       session
                       thread
                       turn
                       assistant-message
                       :error-state summary
                       :status :failed
                       :metadata (append (plist :bridge-error-p t)
                                         (if surface-context
                                             (list :surface-context surface-context)
                                             '())
                                         (if surface-actions
                                             (list :surface-actions surface-actions)
                                             '()))))
    (list :thread (and thread (sbcl-agent-call "THREAD-RECORD-SUMMARY" thread))
          :turn (and turn (sbcl-agent-call "TURN-RECORD-SUMMARY" turn))
          :assistant-message (and assistant-message
                                  (sbcl-agent-call "MESSAGE-RECORD-SUMMARY" assistant-message))
          :summary summary)))

(defun current-provider-for-prompt (environment session prompt options)
  (let* ((base-config (sbcl-agent-call "LOAD-CONFIG"
                                       :working-directory (namestring *project-root*)))
         (profiles (sbcl-agent-call "ENVIRONMENT-PROVIDER-PROFILES" environment)))
    (when (null profiles)
      (sbcl-agent-call "ENSURE-ENVIRONMENT-PROVIDER-PROFILE"
                       :environment environment
                       :config base-config))
    (let* ((route (sbcl-agent-call "SELECT-ENVIRONMENT-PROVIDER-PROFILE"
                                   prompt
                                   :environment environment
                                   :options options
                                   :session session))
           (selected-profile (and route (getf route :selected-profile)))
           (selected-provider-name (and selected-profile (getf selected-profile :provider)))
           (base-provider-name (sbcl-agent-call "CONFIG-PROVIDER" base-config)))
      (or (and selected-profile
               selected-provider-name
               (string-equal selected-provider-name base-provider-name)
               (sbcl-agent-call "PROVIDER-FROM-PROFILE" selected-profile base-config))
          (sbcl-agent-call "MAKE-PROVIDER" base-config)))))

(defun conversation-say-service-response (environment session thread-id prompt options)
  (let ((provider (current-provider-for-prompt environment session prompt options)))
    (sbcl-agent-call "COMMAND-CONVERSATION-EXECUTION-SERVICE"
                     session
                     provider
                     prompt
                     options
                     :source :say
                     :operator-mode :conversation)))

(defun keywordish (value)
  (when (and value (> (length value) 0))
    (intern (string-upcase (substitute #\- #\_ value)) "KEYWORD")))

(defun keywordish-list (values)
  (remove nil
          (mapcar #'keywordish
                  (if (listp values) values '()))))

(defun affirmative-approval-prompt-p (prompt)
  (and (stringp prompt)
       (ignore-errors
         (sbcl-agent-call "AFFIRMATIVE-APPROVAL-CONFIRMATION-P" prompt))))

(defun package-symbol-kind (symbol)
  (cond
    ((macro-function symbol) :macro)
    ((and (fboundp symbol)
          (typep (fdefinition symbol) 'generic-function))
     :generic-function)
    ((find-class symbol nil) :class)
    ((fboundp symbol) :function)
    ((boundp symbol) :variable)
    (t :unknown)))

(defun package-symbol-summary (symbol visibility)
  (list :symbol (symbol-name symbol)
        :kind (package-symbol-kind symbol)
        :visibility visibility))

(defun package-browser-data (session package-name)
  (declare (ignore session))
  (let* ((resolved-package (or (find-package package-name)
                               (error "Unknown package ~S" package-name)))
         (available-packages (sort (remove-duplicates (mapcar #'package-name (list-all-packages))
                                                      :test #'string=)
                                   #'string<))
         (externals '())
         (internals '()))
    (do-external-symbols (symbol resolved-package)
      (push (package-symbol-summary symbol :external) externals))
    (do-symbols (symbol resolved-package)
      (multiple-value-bind (_symbol found-status)
          (find-symbol (symbol-name symbol) resolved-package)
        (declare (ignore _symbol))
        (when (eq found-status :internal)
          (push (package-symbol-summary symbol :internal) internals))))
    (list :package (package-name resolved-package)
          :available-packages available-packages
          :nicknames (sort (copy-list (package-nicknames resolved-package)) #'string<)
          :use-list (sort (mapcar #'package-name (package-use-list resolved-package)) #'string<)
          :external-symbols (sort externals #'string< :key (lambda (entry) (getf entry :symbol)))
          :internal-symbols (sort internals #'string< :key (lambda (entry) (getf entry :symbol)))
          :summary (format nil "~A exposes live namespace structure for exported and internal symbols."
                           (package-name resolved-package)))))

(defun package-browser-entry< (left right)
  (let ((package-comparison (string< (getf left :package-name) (getf right :package-name)))
        (same-package-p (string= (getf left :package-name) (getf right :package-name))))
    (or package-comparison
        (and same-package-p
             (string< (getf left :symbol) (getf right :symbol))))))

(defun runtime-symbol-page-data (session &key package-scope kinds visibility search offset limit)
  (declare (ignore session))
  (let* ((resolved-package-scope
           (when (and package-scope
                      (> (length package-scope) 0)
                      (not (string= package-scope "All Packages")))
             (or (find-package package-scope)
                 (error "Unknown package ~S" package-scope))))
         (available-packages (sort (remove-duplicates (mapcar #'package-name (list-all-packages))
                                                      :test #'string=)
                                   #'string<))
         (packages (if resolved-package-scope
                       (list resolved-package-scope)
                       (sort (copy-list (list-all-packages)) #'string< :key #'package-name)))
         (allowed-kinds (or kinds '()))
         (search-term (when (and search (> (length search) 0))
                        (string-downcase search)))
         (offset-value (max 0 (or offset 0)))
         (limit-value (max 1 (min 200 (or limit 32))))
         (entries '()))
    (dolist (package packages)
      (let ((package-name (package-name package)))
        (labels ((maybe-push-entry (symbol visibility-kind)
                   (let* ((symbol-kind (package-symbol-kind symbol))
                          (symbol-name (symbol-name symbol))
                          (matches-kind (or (null allowed-kinds)
                                            (member symbol-kind allowed-kinds)))
                          (matches-visibility
                            (or (null visibility)
                                (eq visibility :all)
                                (eq visibility visibility-kind)))
                          (matches-search
                            (or (null search-term)
                                (search search-term (string-downcase symbol-name))
                                (search search-term (string-downcase package-name)))))
                     (when (and matches-kind matches-visibility matches-search)
                       (push (list :package-name package-name
                                   :symbol symbol-name
                                   :kind symbol-kind
                                   :visibility visibility-kind)
                             entries)))))
          (do-external-symbols (symbol package)
            (maybe-push-entry symbol :external))
          (do-symbols (symbol package)
            (multiple-value-bind (_symbol found-status)
                (find-symbol (symbol-name symbol) package)
              (declare (ignore _symbol))
              (when (eq found-status :internal)
                (maybe-push-entry symbol :internal)))))))
    (let* ((sorted-entries (sort entries #'package-browser-entry<))
           (total-count (length sorted-entries))
           (paged-entries (subseq sorted-entries
                                  (min offset-value total-count)
                                  (min total-count (+ offset-value limit-value)))))
      (list :package-scope (and resolved-package-scope (package-name resolved-package-scope))
            :available-packages available-packages
            :nicknames (if resolved-package-scope
                           (sort (copy-list (package-nicknames resolved-package-scope)) #'string<)
                           '())
            :use-list (if resolved-package-scope
                          (sort (mapcar #'package-name (package-use-list resolved-package-scope)) #'string<)
                          '())
            :total-count total-count
            :offset offset-value
            :limit limit-value
            :has-more (< (+ offset-value limit-value) total-count)
            :items paged-entries
            :summary (if resolved-package-scope
                         (format nil "~A symbol browser page." (package-name resolved-package-scope))
                         "All packages symbol browser page.")))))

(defun runtime-entity-detail-kind (resolved-symbol)
  (package-symbol-kind resolved-symbol))

(defun generic-function-signature (symbol-name methods)
  (let ((primary (first methods)))
    (if primary
        (format nil "(~A ~{~A~^ ~})"
                (string-downcase symbol-name)
                (mapcar (lambda (specializer)
                          (string-downcase (princ-to-string specializer)))
                        (or (getf primary :specializers) '())))
        (format nil "(~A ...)" (string-downcase symbol-name)))))

(defun class-slot-summaries (class)
  (mapcar (lambda (slot)
            (let ((slot-name (ignore-errors (sb-mop:slot-definition-name slot))))
              (list :label "Slot"
                    :detail (if slot-name
                                (symbol-name slot-name)
                                (princ-to-string slot))
                    :emphasis nil)))
          (ignore-errors (sb-mop:class-direct-slots class))))

(defun class-relationship-summaries (class)
  (append
   (mapcar (lambda (superclass)
             (list :label "Superclass"
                   :detail (princ-to-string (or (ignore-errors (class-name superclass))
                                                superclass))
                   :emphasis nil))
           (ignore-errors (sb-mop:class-direct-superclasses class)))
   (mapcar (lambda (subclass)
             (list :label "Subclass"
                   :detail (princ-to-string (or (ignore-errors (class-name subclass))
                                                subclass))
                   :emphasis nil))
           (ignore-errors (sb-mop:class-direct-subclasses class)))))

(defun generic-method-summary (method)
  (list :label "Method"
        :detail (format nil "Specializers: (~{~A~^ ~})"
                        (mapcar #'princ-to-string
                                (or (getf method :specializers) '())))
        :emphasis (let ((qualifiers (getf method :qualifiers)))
                    (if (and qualifiers
                             (> (length qualifiers) 0))
                        (format nil "Qualifiers: ~{~A~^ ~}" qualifiers)
                        "primary"))))

(defun object-detail-facet (label value)
  (when value
    (list :label label
          :value (if (stringp value)
                     value
                     (princ-to-string value)))))

(defun object-detail-facets (detail)
  (remove nil
          (list (object-detail-facet "Object Kind" (getf detail :kind))
                (object-detail-facet "Type" (getf detail :type))
                (object-detail-facet "Class" (getf detail :class))
                (object-detail-facet "Printed" (getf detail :printed))
                (object-detail-facet "Length" (getf detail :length))
                (object-detail-facet "Count" (getf detail :count))
                (object-detail-facet "Dimensions" (getf detail :dimensions))
                (object-detail-facet "Total Size" (getf detail :total-size))
                (object-detail-facet "Element Type" (getf detail :element-type))
                (object-detail-facet "External Symbols" (getf detail :external-symbol-count))
                (object-detail-facet "Internal Symbols" (getf detail :internal-symbol-count))
                (object-detail-facet "Used Packages"
                                     (let ((used (getf detail :used-packages)))
                                       (and used (> (length used) 0)
                                            (format nil "~{~A~^, ~}" used))))
                (object-detail-facet "Used By Packages"
                                     (let ((used-by (getf detail :used-by-packages)))
                                       (and used-by (> (length used-by) 0)
                                            (format nil "~{~A~^, ~}" used-by))))
                (object-detail-facet "Boundp" (and (member :boundp detail) (getf detail :boundp)))
                (object-detail-facet "Fboundp" (and (member :fboundp detail) (getf detail :fboundp)))
                (object-detail-facet "Keywordp" (and (member :keywordp detail) (getf detail :keywordp)))
                (object-detail-facet "Constantp" (and (member :constantp detail) (getf detail :constantp)))
                (object-detail-facet "Function Kind" (getf detail :function-kind))
                (object-detail-facet "Slot Count" (getf detail :slot-count)))))

(defun object-detail-related-items (detail)
  (append
   (mapcar (lambda (slot)
             (list :label "Slot"
                   :detail (or (getf slot :printed)
                               (if (getf slot :boundp) "bound" "unbound"))
                   :emphasis (getf slot :name)))
           (or (getf detail :slots) '()))
   (mapcar (lambda (entry)
             (list :label "Preview"
                   :detail (if (stringp entry)
                               entry
                               (princ-to-string entry))
                   :emphasis nil))
           (or (getf detail :preview) '()))))

(defun runtime-entity-detail-data (session symbol package)
  (multiple-value-bind (resolved-package resolved-symbol status)
      (sbcl-agent-call "RESOLVE-RUNTIME-SYMBOL" session symbol package)
    (unless resolved-symbol
      (error "Symbol ~S was not found in package ~A" symbol (package-name resolved-package)))
    (let* ((entity-kind (runtime-entity-detail-kind resolved-symbol))
           (object-result (ignore-errors
                            (service-data
                             (sbcl-agent-call "QUERY-RUNTIME-OBJECT-SERVICE"
                                              session
                                              symbol
                                              :package (package-name resolved-package)))))
           (object-detail (and (listp object-result)
                               (getf object-result :object-detail)))
           (definition-result (sbcl-agent-call "TOOL-RUNTIME-FIND-DEFINITION"
                                               session
                                               :symbol symbol
                                               :package (package-name resolved-package)))
           (definitions (getf definition-result :definitions))
           (caller-result (sbcl-agent-call "TOOL-RUNTIME-CALLERS"
                                           session
                                           :symbol symbol
                                           :package (package-name resolved-package)))
           (callers (getf caller-result :callers))
           (methods (and (eq entity-kind :generic-function)
                         (getf (sbcl-agent-call "TOOL-RUNTIME-METHODS"
                                                session
                                                :symbol symbol
                                                :package (package-name resolved-package))
                               :methods)))
           (class (and (eq entity-kind :class)
                       (find-class resolved-symbol nil)))
           (direct-slots (and class (ignore-errors (sb-mop:class-direct-slots class))))
           (direct-superclasses (and class (ignore-errors (sb-mop:class-direct-superclasses class))))
           (direct-subclasses (and class (ignore-errors (sb-mop:class-direct-subclasses class))))
           (facets (append
                    (list (list :label "Entity Kind"
                                :value (string-downcase (symbol-name entity-kind)))
                          (list :label "Status"
                                :value (string-downcase
                                        (symbol-name
                                         (sbcl-agent-call "SYMBOL-STATUS-KEYWORD" status))))
                          (list :label "Definition Count"
                                :value (princ-to-string (length definitions)))
                          (list :label "Caller Count"
                                :value (princ-to-string (length callers)))
                          (list :label "Home Package"
                                :value (package-name resolved-package)))
                    (when methods
                      (list (list :label "Method Count"
                                  :value (princ-to-string (length methods)))))
                    (when class
                      (list (list :label "Direct Slots"
                                  :value (princ-to-string (length direct-slots)))
                            (list :label "Superclass Count"
                                  :value (princ-to-string (length direct-superclasses)))
                            (list :label "Subclass Count"
                                  :value (princ-to-string (length direct-subclasses)))))
                    (when object-detail
                      (object-detail-facets object-detail))))
           (related-items
             (append
              (when object-detail
                (object-detail-related-items object-detail))
              (when methods
                (mapcar #'generic-method-summary methods))
              (when class
                (class-relationship-summaries class))
              (when class
                (class-slot-summaries class))
              (mapcar (lambda (caller)
                        (list :label "Caller"
                              :detail (getf caller :path)
                              :emphasis (format nil "line ~A" (getf caller :line))
                              :path (getf caller :path)
                              :line (getf caller :line)))
                      callers)
              (mapcar (lambda (definition)
                        (list :label "Definition"
                              :detail (getf definition :path)
                              :emphasis (format nil "line ~A" (getf definition :line))
                              :path (getf definition :path)
                              :line (getf definition :line)))
                      definitions))))
      (list :package (package-name resolved-package)
            :symbol (symbol-name resolved-symbol)
            :entity-kind entity-kind
            :signature (cond
                         ((eq entity-kind :generic-function)
                          (generic-function-signature (symbol-name resolved-symbol) methods))
                         ((eq entity-kind :class)
                         (format nil "(defclass ~A ...)" (string-downcase (symbol-name resolved-symbol))))
                        (t
                          (format nil "(~A ...)" (string-downcase (symbol-name resolved-symbol)))))
            :summary (cond
                      (object-detail
                       (format nil "~A resolves to a live ~A object in ~A with structured runtime detail."
                               (symbol-name resolved-symbol)
                               (or (getf object-detail :kind) "runtime")
                               (package-name resolved-package)))
                      ((eq entity-kind :generic-function)
                       (format nil "~A is a live generic function. Dispatch, methods, and definitions should stay visible together."
                               (symbol-name resolved-symbol)))
                      ((eq entity-kind :class)
                       (format nil "~A is a live class. Slots and definitions should remain inspectable from the same browser surface."
                               (symbol-name resolved-symbol)))
                      (t
                       (format nil "~A is available as a live runtime entity in ~A."
                               (symbol-name resolved-symbol)
                               (package-name resolved-package))))
            :facets facets
            :related-items related-items))))

(defun service-response-for (environment operation environment-id request-json)
  (unless (string= operation "environment.load-image")
    (assert-bridge-environment-match environment environment-id operation))
  (let ((environment environment))
    (cond
      ((string= operation "environment.bootstrap")
       (let* ((session (bridge-session environment))
              (summary-response
                (sbcl-agent-call "QUERY-ENVIRONMENT-SUMMARY-SERVICE" environment))
              (status-response
                (sbcl-agent-call "QUERY-ENVIRONMENT-STATUS-SERVICE" environment))
              (workspace-summary-response
                (sbcl-agent-call "QUERY-RGP-WORKSPACE-SERVICE" session environment))
              (desktop-model-response
                (sbcl-agent-call "QUERY-SHELL-DESKTOP-MODEL-SERVICE"
                                 session
                                 :environment environment)))
         (sbcl-agent-call "MAKE-SERVICE-QUERY-RESPONSE"
                          :environment
                          :bootstrap
                          (list :summary (service-data summary-response)
                                :status (service-data status-response)
                                :workspace-summary (service-data workspace-summary-response)
                                :desktop-model (service-data desktop-model-response))
                          :metadata
                          (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                           :authority :environment
                                           :read-model :environment-bootstrap-v1
                                           :session session))))
      ((string= operation "environment.summary")
       (sbcl-agent-call "QUERY-ENVIRONMENT-SUMMARY-SERVICE" environment))
      ((string= operation "environment.status")
       (sbcl-agent-call "QUERY-ENVIRONMENT-STATUS-SERVICE" environment))
      ((string= operation "workspace.summary")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "QUERY-RGP-WORKSPACE-SERVICE" session environment)))
      ((string= operation "desktop.show")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "QUERY-SHELL-DESKTOP-MODEL-SERVICE" session :environment environment)))
      ((string= operation "desktop.preferences.get")
       (sbcl-agent-call "QUERY-ENVIRONMENT-DESKTOP-PREFERENCES-SERVICE" environment))
      ((string= operation "desktop.preferences.set")
       (let* ((request-object (request-object request-json))
              (desktop-preferences-object (and request-object
                                               (sbcl-agent-call "JSON-OBJECT-VALUE"
                                                                request-object
                                                                "desktopPreferences")))
              (desktop-preferences
                (if (and (listp desktop-preferences-object)
                         (every #'consp desktop-preferences-object))
                    (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" desktop-preferences-object)
                    '())))
         (sbcl-agent-call "COMMAND-ENVIRONMENT-SET-DESKTOP-PREFERENCES-SERVICE"
                          desktop-preferences
                          environment)))
      ((string= operation "environment.provider.get")
       (sbcl-agent-call "QUERY-ENVIRONMENT-PROVIDER-SERVICE" environment))
      ((string= operation "environment.provider.configure")
       (let* ((request-object (request-object request-json))
              (payload (if (and (listp request-object)
                                (every #'consp request-object))
                           (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" request-object)
                           '())))
         (sbcl-agent-call "COMMAND-ENVIRONMENT-PROVIDER-CONFIGURE-SERVICE"
                          (or (getf payload :profile-name) "")
                          payload
                          environment)))
      ((string= operation "environment.provider.use")
       (let* ((request-object (request-object request-json))
              (payload (if (and (listp request-object)
                                (every #'consp request-object))
                           (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" request-object)
                           '())))
         (sbcl-agent-call "COMMAND-ENVIRONMENT-PROVIDER-USE-SERVICE"
                          (or (getf payload :profile-name) "")
                          environment)))
      ((string= operation "environment.provider.routing")
       (let* ((request-object (request-object request-json))
              (payload (if (and (listp request-object)
                                (every #'consp request-object))
                           (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" request-object)
                           '())))
         (sbcl-agent-call "COMMAND-ENVIRONMENT-PROVIDER-ROUTING-SERVICE"
                          (getf payload :mode)
                          environment)))
      ((string= operation "environment.image-registry")
       (sbcl-agent-call "QUERY-ENVIRONMENT-IMAGE-REGISTRY-SERVICE" environment))
      ((string= operation "environment.save-image")
       (let* ((request-object (request-object request-json))
              (image-name (and request-object
                               (sbcl-agent-call "JSON-OBJECT-VALUE" request-object "imageName")))
              (overwrite (and request-object
                              (sbcl-agent-call "JSON-OBJECT-VALUE" request-object "overwrite"))))
         (sbcl-agent-call "COMMAND-ENVIRONMENT-SAVE-IMAGE-SERVICE"
                          (or image-name "")
                          :overwrite (and overwrite t)
                          :environment environment)))
      ((string= operation "environment.load-image")
       (let* ((request-object (request-object request-json))
              (image-id-or-name (and request-object
                                     (sbcl-agent-call "JSON-OBJECT-VALUE" request-object "imageIdOrName")))
              (response (sbcl-agent-call "COMMAND-ENVIRONMENT-LOAD-IMAGE-SERVICE"
                                         (or image-id-or-name "")
                                         environment)))
         (bootstrap-desktop-environment environment)
         response))
      ((string= operation "environment.revert-image")
       (let ((response (sbcl-agent-call "COMMAND-ENVIRONMENT-REVERT-IMAGE-SERVICE" environment)))
         (bootstrap-desktop-environment environment)
         response))
      ((string= operation "desktop.action")
       (let* ((session (bridge-session environment))
              (request-object (request-object request-json))
              (action (if request-object
                          (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" request-object)
                          '())))
         (sbcl-agent-call "COMMAND-SHELL-DESKTOP-ACTION-SERVICE"
                          session
                          action
                          :environment environment)))
      ((string= operation "desktop.restore")
       (let* ((session (bridge-session environment))
              (request-object (request-object request-json))
              (panel-id (keywordish (and request-object
                                         (sbcl-agent-call "JSON-OBJECT-VALUE" request-object "panelId"))))
              (panel-state-object (and request-object
                                       (sbcl-agent-call "JSON-OBJECT-VALUE" request-object "panelState")))
              (panel-state (if (and (listp panel-state-object)
                                    (every #'consp panel-state-object))
                               (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" panel-state-object)
                               '())))
         (sbcl-agent-call "COMMAND-SHELL-DESKTOP-RESTORE-SERVICE"
                          session
                          :panel-id panel-id
                          :panel-state panel-state
                          :environment environment)))
      ((string= operation "runtime.summary")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "QUERY-RUNTIME-SUMMARY-SERVICE" session)))
      ((string= operation "calculator.summary")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "QUERY-CALCULATOR-SUMMARY-SERVICE" session)))
      ((string= operation "runtime.telemetry")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "QUERY-RUNTIME-TELEMETRY-SERVICE" session)))
      ((string= operation "package-management.summary")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "QUERY-PACKAGE-MANAGEMENT-SUMMARY-SERVICE" session)))
      ((string= operation "desktop-task.manifests")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "QUERY-DESKTOP-TASK-MANIFEST-LIST-SERVICE" session)))
      ((string= operation "desktop-task.records")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "QUERY-DESKTOP-TASK-RECORD-LIST-SERVICE" session)))
      ((string= operation "desktop-task.pending-approval")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "QUERY-DESKTOP-TASK-PENDING-APPROVAL-SERVICE" session)))
      ((string= operation "desktop-task.actor-flow")
       (let* ((session (bridge-session environment))
              (session-id (request-object-value request-json "sessionId"))
              (approval-id (request-object-value request-json "approvalId"))
              (pending-action-id (request-object-value request-json "pendingActionId"))
              (actor-message-id (request-object-value request-json "actorMessageId"))
              (scope-id (request-object-value request-json "scopeId"))
              (latest-only-p (request-object-value request-json "latestOnlyP")))
         (sbcl-agent-call "QUERY-DESKTOP-TASK-ACTOR-FLOW-SERVICE"
                          session
                          :session-id session-id
                          :approval-id approval-id
                          :pending-action-id pending-action-id
                          :actor-message-id actor-message-id
                          :scope-id scope-id
                          :latest-only-p latest-only-p)))
      ((string= operation "desktop-task.actor-system-panel")
       (let* ((session (bridge-session environment))
              (session-id (request-object-value request-json "sessionId")))
         (sbcl-agent-call "QUERY-DESKTOP-TASK-ACTOR-SYSTEM-PANEL-SERVICE"
                          session
                          :session-id session-id)))
      ((string= operation "desktop-task.runtime-state")
       (let* ((session (bridge-session environment))
              (session-id (request-object-value request-json "sessionId")))
         (sbcl-agent-call "QUERY-DESKTOP-TASK-RUNTIME-STATE-SERVICE"
                          session
                          :session-id session-id)))
      ((string= operation "desktop-task.supervision-incidents")
       (let* ((session (bridge-session environment))
              (session-id (request-object-value request-json "sessionId"))
              (mailbox (request-object-value request-json "mailbox"))
              (mailbox-entry-id (request-object-value request-json "mailboxEntryId"))
              (actor-id (request-object-value request-json "actorId"))
              (open-only-p (request-object-value request-json "openOnlyP")))
         (sbcl-agent-call "QUERY-DESKTOP-TASK-SUPERVISION-INCIDENTS-SERVICE"
                          session
                          :session-id session-id
                          :mailbox (and mailbox (intern (string-upcase mailbox) "KEYWORD"))
                          :mailbox-entry-id mailbox-entry-id
                          :actor-id actor-id
                          :open-only-p open-only-p)))
      ((string= operation "desktop-task.actor-trace")
       (let* ((session (bridge-session environment))
              (actor-role (request-object-value request-json "actorRole"))
              (actor-message-id (request-object-value request-json "actorMessageId"))
              (phase (request-object-value request-json "phase"))
              (latest-only-p (request-object-value request-json "latestOnlyP"))
              (dead-letters-only-p (request-object-value request-json "deadLettersOnlyP")))
         (sbcl-agent-call "QUERY-DESKTOP-TASK-ACTOR-TRACE-SERVICE"
                          session
                          :actor-role actor-role
                          :actor-message-id actor-message-id
                          :phase (and phase (intern (string-upcase phase) "KEYWORD"))
                          :latest-only-p latest-only-p
                          :dead-letters-only-p dead-letters-only-p)))
      ((string= operation "desktop-task.dlq")
       (let* ((session (bridge-session environment))
              (actor-role (request-object-value request-json "actorRole")))
         (sbcl-agent-call "QUERY-DESKTOP-TASK-DEAD-LETTER-QUEUE-SERVICE"
                          session
                          :actor-role actor-role)))
      ((string= operation "desktop-task.mcp-servers")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "QUERY-DESKTOP-TASK-MCP-SERVER-LIST-SERVICE" session)))
      ((string= operation "desktop-task.mcp-server")
       (let* ((session (bridge-session environment))
              (server-id (request-object-value request-json "serverId")))
         (unless server-id
           (error "desktop-task.mcp-server requires a serverId payload"))
         (sbcl-agent-call "QUERY-DESKTOP-TASK-MCP-SERVER-DETAIL-SERVICE"
                          session
                          server-id)))
      ((string= operation "desktop-task.configure-mcp-server")
       (let* ((session (bridge-session environment))
              (request-object (request-object request-json))
              (payload (if (and (listp request-object)
                                (every #'consp request-object))
                           (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" request-object)
                           '())))
         (sbcl-agent-call "COMMAND-DESKTOP-TASK-CONFIGURE-MCP-SERVER-SERVICE"
                          session
                          :server-id (getf payload :server-id)
                          :name (or (getf payload :name) "")
                          :transport (getf payload :transport)
                          :command (getf payload :command)
                          :arguments (getf payload :arguments)
                          :environment-variables (getf payload :environment-variables)
                          :working-directory (getf payload :working-directory)
                          :endpoint (getf payload :endpoint)
                          :capabilities (getf payload :capabilities)
                          :retry-policy (getf payload :retry-policy)
                          :health-status (getf payload :health-status)
                          :enabled-p (getf payload :enabled-p)
                          :discoverable-p (getf payload :discoverable-p))))
      ((string= operation "desktop-task.remove-mcp-server")
       (let* ((session (bridge-session environment))
              (server-id (request-object-value request-json "serverId")))
         (unless server-id
           (error "desktop-task.remove-mcp-server requires a serverId payload"))
         (sbcl-agent-call "COMMAND-DESKTOP-TASK-REMOVE-MCP-SERVER-SERVICE"
                          session
                          server-id)))
      ((string= operation "package-management.install-quicklisp")
       (let* ((session (bridge-session environment))
              (system-name (request-object-value request-json "systemName")))
         (unless system-name
           (error "package-management.install-quicklisp requires a systemName payload"))
         (sbcl-agent-call "COMMAND-PACKAGE-MANAGEMENT-INSTALL-QUICKLISP-SERVICE"
                          session
                          system-name)))
      ((string= operation "package-management.run-qlot")
       (let* ((session (bridge-session environment))
              (arguments (request-object-value request-json "args")))
         (sbcl-agent-call "COMMAND-PACKAGE-MANAGEMENT-RUN-QLOT-SERVICE"
                          session
                          (if (listp arguments) arguments '()))))
      ((string= operation "package-management.add-source-registry-entry")
       (let* ((session (bridge-session environment))
              (path (request-object-value request-json "path")))
         (unless path
           (error "package-management.add-source-registry-entry requires a path payload"))
         (sbcl-agent-call "COMMAND-PACKAGE-MANAGEMENT-ADD-SOURCE-REGISTRY-ENTRY-SERVICE"
                          session
                          path)))
      ((string= operation "package-management.update-source-registry-entry")
       (let* ((session (bridge-session environment))
              (old-path (request-object-value request-json "oldPath"))
              (new-path (request-object-value request-json "newPath")))
         (unless old-path
           (error "package-management.update-source-registry-entry requires an oldPath payload"))
         (unless new-path
           (error "package-management.update-source-registry-entry requires a newPath payload"))
         (sbcl-agent-call "COMMAND-PACKAGE-MANAGEMENT-UPDATE-SOURCE-REGISTRY-ENTRY-SERVICE"
                          session
                          old-path
                          new-path)))
      ((string= operation "package-management.remove-source-registry-entry")
       (let* ((session (bridge-session environment))
              (path (request-object-value request-json "path")))
         (unless path
           (error "package-management.remove-source-registry-entry requires a path payload"))
         (sbcl-agent-call "COMMAND-PACKAGE-MANAGEMENT-REMOVE-SOURCE-REGISTRY-ENTRY-SERVICE"
                          session
                          path)))
      ((string= operation "package-management.add-local-project")
       (let* ((session (bridge-session environment))
              (path (request-object-value request-json "path"))
              (name (request-object-value request-json "name")))
         (unless path
           (error "package-management.add-local-project requires a path payload"))
         (sbcl-agent-call "COMMAND-PACKAGE-MANAGEMENT-ADD-LOCAL-PROJECT-SERVICE"
                          session
                          path
                          :name name)))
      ((string= operation "package-management.remove-local-project")
       (let* ((session (bridge-session environment))
              (name (request-object-value request-json "name")))
         (unless name
           (error "package-management.remove-local-project requires a name payload"))
         (sbcl-agent-call "COMMAND-PACKAGE-MANAGEMENT-REMOVE-LOCAL-PROJECT-SERVICE"
                          session
                          name)))
      ((string= operation "console.stream")
       (sbcl-agent-call "QUERY-CONSOLE-LOG-STREAM-SERVICE"
                        :environment environment
                        :after-cursor (request-object-value request-json "afterCursor")
                        :limit (or (request-object-value request-json "limit") 50)
                        :type (keywordish (request-object-value request-json "type"))
                        :source (request-object-value request-json "source")))
      ((string= operation "runtime.package-browser")
       (let* ((session (bridge-session environment))
              (package-name (or (request-object-value request-json "packageName")
                                (sbcl-agent-call "AGENT-SESSION-PACKAGE" session))))
         (sbcl-agent-call "MAKE-SERVICE-QUERY-RESPONSE"
                          :runtime
                          :package-browser
                          (package-browser-data session package-name)
                          :metadata
                          (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                           :authority :environment
                                           :read-model :package-browser-v1
                                           :session session
                                           :runtime-id (sbcl-agent-call "DEFAULT-RUNTIME-ID")))))
      ((string= operation "runtime.symbol-page")
       (let* ((session (bridge-session environment))
              (package-scope (request-object-value request-json "packageScope"))
              (raw-kinds (request-object-value request-json "kinds"))
              (kinds (keywordish-list raw-kinds))
              (visibility (or (keywordish (request-object-value request-json "visibility")) :all))
              (search (request-object-value request-json "search"))
              (offset (request-object-value request-json "offset"))
              (limit (request-object-value request-json "limit")))
         (format *error-output*
                 "[bridge-runtime-symbol-page] env=~A package-scope=~S raw-kinds=~S kinds=~S visibility=~S offset=~S limit=~S~%"
                 (ignore-errors (sbcl-agent-call "ENVIRONMENT-ID" environment))
                 package-scope
                 raw-kinds
                 kinds
                 visibility
                 offset
                 limit)
         (finish-output *error-output*)
         (sbcl-agent-call "MAKE-SERVICE-QUERY-RESPONSE"
                          :runtime
                          :symbol-page
                          (runtime-symbol-page-data session
                                                    :package-scope package-scope
                                                    :kinds kinds
                                                    :visibility visibility
                                                    :search search
                                                    :offset offset
                                                    :limit limit)
                          :metadata
                          (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                           :authority :environment
                                           :read-model :symbol-page-v1
                                           :session session
                                           :runtime-id (sbcl-agent-call "DEFAULT-RUNTIME-ID")))))
      ((string= operation "runtime.inspect-symbol")
       (let* ((session (bridge-session environment))
              (symbol (request-object-value request-json "symbol"))
              (package (request-object-value request-json "packageName"))
              (mode (request-object-value request-json "mode")))
         (unless symbol
           (error "runtime.inspect-symbol requires a symbol payload"))
         (cond
           ((string= mode "describe")
            (sbcl-agent-call "MAKE-SERVICE-QUERY-RESPONSE"
                             :runtime
                             :inspect-symbol
                             (service-data
                              (sbcl-agent-call "QUERY-RUNTIME-DESCRIBE-SYMBOL-SERVICE"
                                               session
                                               symbol
                                               :package package))
                             :metadata
                             (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                              :authority :environment
                                              :read-model :runtime-inspector-v1
                                              :session session
                                              :runtime-id (sbcl-agent-call "DEFAULT-RUNTIME-ID"))))
           ((string= mode "definitions")
            (sbcl-agent-call "MAKE-SERVICE-QUERY-RESPONSE"
                             :runtime
                             :inspect-symbol
                             (service-data
                              (sbcl-agent-call "QUERY-RUNTIME-FIND-DEFINITION-SERVICE"
                                               session
                                               symbol
                                               :package package))
                             :metadata
                             (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                              :authority :environment
                                              :read-model :runtime-inspector-v1
                                              :session session
                                              :runtime-id (sbcl-agent-call "DEFAULT-RUNTIME-ID"))))
           ((string= mode "callers")
            (sbcl-agent-call "MAKE-SERVICE-QUERY-RESPONSE"
                             :runtime
                             :inspect-symbol
                             (service-data
                              (sbcl-agent-call "QUERY-RUNTIME-CALLERS-SERVICE"
                                               session
                                               symbol
                                               :package package))
                             :metadata
                             (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                              :authority :environment
                                              :read-model :runtime-inspector-v1
                                              :session session
                                              :runtime-id (sbcl-agent-call "DEFAULT-RUNTIME-ID"))))
           ((string= mode "methods")
            (sbcl-agent-call "MAKE-SERVICE-QUERY-RESPONSE"
                             :runtime
                             :inspect-symbol
                             (service-data
                              (sbcl-agent-call "QUERY-RUNTIME-METHODS-SERVICE"
                                               session
                                               symbol
                                               :package package))
                             :metadata
                             (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                              :authority :environment
                                              :read-model :runtime-inspector-v1
                                              :session session
                                              :runtime-id (sbcl-agent-call "DEFAULT-RUNTIME-ID"))))
           ((string= mode "divergence")
            (sbcl-agent-call "MAKE-SERVICE-QUERY-RESPONSE"
                             :runtime
                             :inspect-symbol
                             (service-data
                              (sbcl-agent-call "QUERY-RUNTIME-SOURCE-IMAGE-DIVERGENCE-SERVICE"
                                               session
                                               symbol
                                               :package package))
                             :metadata
                             (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                              :authority :environment
                                              :read-model :runtime-inspector-v1
                                              :session session
                                              :runtime-id (sbcl-agent-call "DEFAULT-RUNTIME-ID"))))
           (t
            (error "Unsupported runtime.inspect-symbol mode ~A" mode)))))
      ((string= operation "runtime.entity-detail")
       (let* ((session (bridge-session environment))
              (symbol (request-object-value request-json "symbol"))
              (package (request-object-value request-json "packageName")))
         (unless symbol
           (error "runtime.entity-detail requires a symbol payload"))
         (sbcl-agent-call "MAKE-SERVICE-QUERY-RESPONSE"
                          :runtime
                          :entity-detail
                          (runtime-entity-detail-data session symbol package)
                          :metadata
                          (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                           :authority :environment
                                           :read-model :runtime-entity-detail-v1
                                           :session session
                                           :runtime-id (sbcl-agent-call "DEFAULT-RUNTIME-ID")))))
      ((string= operation "runtime.eval")
       (let* ((session (bridge-session environment))
              (form (request-object-value request-json "form"))
              (package (request-object-value request-json "packageName"))
              (mutating (request-object-value request-json "mutating"))
              (recovery-launch (request-object-value request-json "recoveryLaunch")))
        (unless form
          (error "runtime.eval requires a form payload"))
        (sbcl-agent-call "COMMAND-RUNTIME-EVAL-SERVICE"
                         session
                         form
                         :package package
                         :mutating mutating
                         :recovery-launch recovery-launch)))
      ((string= operation "calculator.set-expression")
       (let* ((session (bridge-session environment))
              (expression (request-object-value request-json "expression")))
         (unless expression
           (error "calculator.set-expression requires an expression payload"))
         (sbcl-agent-call "COMMAND-CALCULATOR-SET-EXPRESSION-SERVICE"
                          session
                          expression)))
      ((string= operation "calculator.append-token")
       (let* ((session (bridge-session environment))
              (token (request-object-value request-json "token")))
         (unless token
           (error "calculator.append-token requires a token payload"))
         (sbcl-agent-call "COMMAND-CALCULATOR-APPEND-TOKEN-SERVICE"
                          session
                          token)))
      ((string= operation "calculator.backspace")
       (sbcl-agent-call "COMMAND-CALCULATOR-BACKSPACE-SERVICE"
                        (bridge-session environment)))
      ((string= operation "calculator.clear")
       (sbcl-agent-call "COMMAND-CALCULATOR-CLEAR-SERVICE"
                        (bridge-session environment)))
      ((string= operation "calculator.set-mode")
       (let* ((session (bridge-session environment))
              (mode (keywordish (request-object-value request-json "mode"))))
         (unless mode
           (error "calculator.set-mode requires a mode payload"))
         (sbcl-agent-call "COMMAND-CALCULATOR-SET-MODE-SERVICE"
                          session
                          mode)))
      ((string= operation "calculator.set-base")
       (let* ((session (bridge-session environment))
              (base (request-object-value request-json "base")))
         (unless base
           (error "calculator.set-base requires a base payload"))
         (sbcl-agent-call "COMMAND-CALCULATOR-SET-BASE-SERVICE"
                          session
                          base)))
      ((string= operation "calculator.set-word-size")
       (let* ((session (bridge-session environment))
              (word-size (request-object-value request-json "wordSize")))
         (unless word-size
           (error "calculator.set-word-size requires a wordSize payload"))
         (sbcl-agent-call "COMMAND-CALCULATOR-SET-WORD-SIZE-SERVICE"
                          session
                          word-size)))
      ((string= operation "calculator.set-angle-unit")
       (let* ((session (bridge-session environment))
              (angle-unit (keywordish (request-object-value request-json "angleUnit"))))
         (unless angle-unit
           (error "calculator.set-angle-unit requires an angleUnit payload"))
         (sbcl-agent-call "COMMAND-CALCULATOR-SET-ANGLE-UNIT-SERVICE"
                          session
                          angle-unit)))
      ((string= operation "calculator.evaluate")
       (let* ((session (bridge-session environment))
              (expression (request-object-value request-json "expression"))
              (mode (or (keywordish (request-object-value request-json "mode")) :basic))
              (base (or (request-object-value request-json "base") 10))
              (word-size (or (request-object-value request-json "wordSize") 64))
              (angle-unit (or (keywordish (request-object-value request-json "angleUnit")) :radians)))
         (unless expression
           (error "calculator.evaluate requires an expression payload"))
         (sbcl-agent-call "COMMAND-CALCULATOR-EVALUATE-SERVICE"
                          session
                          expression
                          :mode mode
                          :base base
                          :word-size word-size
                          :angle-unit angle-unit)))
      ((string= operation "source.stage-change")
       (let* ((session (bridge-session environment))
              (path (request-object-value request-json "path"))
              (content (request-object-value request-json "content")))
         (unless path
           (error "source.stage-change requires a path payload"))
         (unless content
           (error "source.stage-change requires a content payload"))
         (let* ((patch-response (sbcl-agent-call "COMMAND-APPLY-PATCH-SERVICE"
                                                 session
                                                 (list (list :write path content))))
                (result (sbcl-agent-call "MAKE-SERVICE-COMMAND-RESPONSE"
                                         :source
                                         :stage-change
                                         (service-data patch-response)
                                         :metadata
                                         (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                                          :authority :environment
                                                          :command-model :source-mutation-v1
                                                          :session session
                                                          :policy-id :workspace-write)))
                (data (getf result :data))
                (patch (getf data :patch))
                (first-write (and (listp patch) (first patch))))
           (if first-write
               (progn
                 (setf (getf data :path) (getf first-write :path))
                 (setf (getf data :bytes-written) (getf first-write :bytes))
                 (setf (getf data :summary) "Source change staged through governed workspace mutation.")
                 (setf (getf data :artifact-ids) '()))
               (setf (getf data :summary) "No patch operations were applied."))
           result)))
      ((string= operation "runtime.reload-file")
       (let* ((session (bridge-session environment))
              (path (request-object-value request-json "path")))
         (unless path
           (error "runtime.reload-file requires a path payload"))
         (sbcl-agent-call "COMMAND-RUNTIME-RELOAD-FILE-SERVICE" session path)))
      ((string= operation "conversation.thread-list")
       (ensure-desktop-conversation-thread-list (bridge-session environment)))
      ((string= operation "conversation.workspace")
       (let* ((session (bridge-session environment))
              (requested-thread-id (request-object-value request-json "threadId"))
              (requested-turn-id (request-object-value request-json "turnId"))
              (thread-list-response
                (ensure-desktop-conversation-thread-list session))
              (thread-summaries (service-data thread-list-response))
              (selected-thread-id
                (or requested-thread-id
                    (getf (first thread-summaries) :id)))
              (thread-detail-response
                (and selected-thread-id
                     (sbcl-agent-call "QUERY-CONVERSATION-THREAD-DETAIL-SERVICE"
                                      session
                                      selected-thread-id)))
              (selected-turn-id
                (or requested-turn-id
                    (and thread-detail-response
                         (getf (first (getf (service-data thread-detail-response) :turns)) :id))))
              (turn-detail-response
                (and selected-turn-id
                     (sbcl-agent-call "QUERY-CONVERSATION-TURN-DETAIL-SERVICE"
                                      session
                                      selected-turn-id))))
         (sbcl-agent-call "MAKE-SERVICE-QUERY-RESPONSE"
                          :conversation
                          :workspace
                          (list :threads thread-summaries
                                :selected-thread (and thread-detail-response
                                                      (service-data thread-detail-response))
                                :selected-turn (and turn-detail-response
                                                    (service-data turn-detail-response)))
                          :metadata
                          (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                           :authority :environment
                                           :read-model :conversation-workspace-v1
                                           :session session
                                           :thread-id selected-thread-id
                                           :turn-id selected-turn-id))))
      ((string= operation "conversation.create-thread")
       (let* ((session (bridge-session environment))
              (title (request-object-value request-json "title"))
              (summary (request-object-value request-json "summary")))
        (unless title
          (error "conversation.create-thread requires a title payload"))
        (sbcl-agent-call "COMMAND-CONVERSATION-CREATE-THREAD-SERVICE"
                         session
                         :title title
                         :summary summary)))
      ((string= operation "conversation.update-thread")
       (let* ((session (bridge-session environment))
              (thread-id (request-object-value request-json "threadId"))
              (title (request-object-value request-json "title"))
              (summary (request-object-value request-json "summary")))
         (unless thread-id
           (error "conversation.update-thread requires a threadId payload"))
         (unless title
           (error "conversation.update-thread requires a title payload"))
         (sbcl-agent-call "COMMAND-CONVERSATION-UPDATE-THREAD-SERVICE"
                          session
                          thread-id
                          :title title
                          :summary summary)))
      ((string= operation "desktop-task.approve-message")
       (let* ((session (bridge-session environment))
              (actor-message-id (request-object-value request-json "actorMessageId")))
         (unless actor-message-id
           (error "desktop-task.approve-message requires an actorMessageId payload"))
         (let ((provider (current-provider-for-prompt environment session "Approve pending actor message." '())))
           (sbcl-agent-call "COMMAND-DESKTOP-TASK-APPROVE-ACTOR-MESSAGE-SERVICE"
                            session
                            provider
                            actor-message-id
                            :source :say
                            :operator-mode :conversation))))
      ((string= operation "desktop-task.approve-approval")
       (let* ((session (bridge-session environment))
              (approval-id (request-object-value request-json "approvalId"))
              (session-id (request-object-value request-json "sessionId")))
         (unless approval-id
           (error "desktop-task.approve-approval requires an approvalId payload"))
         (let ((provider (current-provider-for-prompt environment session "Approve pending governance request." '())))
           (sbcl-agent-call "COMMAND-DESKTOP-TASK-APPROVE-APPROVAL-SERVICE"
                            session
                            provider
                            approval-id
                            :session-id session-id
                            :source :say
                            :operator-mode :conversation))))
      ((string= operation "conversation.send-message")
       (let* ((session (bridge-session environment))
              (thread-id (request-object-value request-json "threadId"))
              (prompt (request-object-value request-json "prompt"))
              (attachments (request-attachment-plists request-json "attachments"))
              (surface-context (request-record-plist request-json "surfaceContext"))
              (surface-actions (request-record-list-plists request-json "surfaceActions"))
              (options (append (if attachments
                                   (list :attachments attachments)
                                   '())
                               (if surface-context
                                   (list :surface-context surface-context)
                                   '())
                               (if surface-actions
                                   (list :surface-actions surface-actions)
                                   '()))))
         (unless thread-id
           (error "conversation.send-message requires a threadId payload"))
         (unless prompt
           (error "conversation.send-message requires a prompt payload"))
         (unless (affirmative-approval-prompt-p prompt)
           (sbcl-agent-call "COMMAND-CONVERSATION-USE-THREAD-SERVICE" session thread-id))
         (handler-case
             (conversation-say-service-response environment session thread-id prompt options)
           (error (condition)
             (sbcl-agent-call "MAKE-SERVICE-RESPONSE"
                              :execution
                              :say
                              :command
                              (record-conversation-send-failure session
                                                                thread-id
                                                                (princ-to-string condition)
                                                                :surface-context surface-context
                                                                :surface-actions surface-actions)
                              :status :error
                              :metadata (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                                         :authority :environment
                                                         :session session
                                                         :thread-id thread-id))))))
      ((string= operation "conversation.send-message-stream")
       (let* ((session (bridge-session environment))
              (thread-id (request-object-value request-json "threadId"))
              (prompt (request-object-value request-json "prompt"))
              (attachments (request-attachment-plists request-json "attachments"))
              (surface-context (request-record-plist request-json "surfaceContext"))
              (surface-actions (request-record-list-plists request-json "surfaceActions"))
              (options (append '(:stream t)
                               (if attachments
                                   (list :attachments attachments)
                                   '())
                               (if surface-context
                                   (list :surface-context surface-context)
                                   '())
                               (if surface-actions
                                   (list :surface-actions surface-actions)
                                   '()))))
         (unless thread-id
           (error "conversation.send-message-stream requires a threadId payload"))
         (unless prompt
           (error "conversation.send-message-stream requires a prompt payload"))
         (unless (affirmative-approval-prompt-p prompt)
           (sbcl-agent-call "COMMAND-CONVERSATION-USE-THREAD-SERVICE" session thread-id))
         (let ((listener (lambda (event)
                           (emit-stream-frame :event (provider-event-stream-payload event)))))
           (progv (list (sbcl-agent-symbol "*STREAM-EVENT-LISTENER*"))
                  (list listener)
               (handler-case
                 (conversation-say-service-response environment session thread-id prompt options)
               (error (condition)
                 (format *error-output*
                         "~&[live-bridge] conversation.send-message-stream failure thread=~A type=~A message=~A~%"
                         thread-id
                         (type-of condition)
                         (princ-to-string condition))
                 (sbcl-agent-call "MAKE-SERVICE-RESPONSE"
                                  :execution
                                  :say
                                  :command
                                  (record-conversation-send-failure session
                                                                    thread-id
                                                                    (princ-to-string condition)
                                                                    :surface-context surface-context
                                                                    :surface-actions surface-actions)
                                  :status :error
                                  :metadata (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                                             :authority :environment
                                                             :session session
                                                             :thread-id thread-id))))))))
      ((string= operation "conversation.thread-detail")
       (let ((request-id (request-object-value request-json "threadId")))
         (sbcl-agent-call "QUERY-CONVERSATION-THREAD-DETAIL-SERVICE"
                          (bridge-session environment)
                          request-id)))
      ((string= operation "conversation.latency")
       (let ((turn-id (request-object-value request-json "turnId")))
         (unless turn-id
           (error "conversation.latency requires a turnId payload"))
         (sbcl-agent-call "QUERY-CONVERSATION-LATENCY-SERVICE"
                          (bridge-session environment)
                          turn-id)))
      ((string= operation "transcript.workspace")
       (let* ((family (keywordish (request-object-value request-json "family")))
              (visibility (keywordish (request-object-value request-json "visibility")))
              (event-limit (or (request-object-value request-json "eventLimit") 12))
              (include-events (not (eq (request-object-value request-json "includeEvents") :false)))
              (include-environment-console
                (not (eq (request-object-value request-json "includeEnvironmentConsole") :false)))
              (console-limit (or (request-object-value request-json "consoleLimit") 40))
              (events-response
                (and include-events
                     (sbcl-agent-call "QUERY-ENVIRONMENT-EVENTS-SERVICE"
                                      :tail event-limit
                                      :environment environment)))
              (environment-console-response
                (and include-environment-console
                     (sbcl-agent-call "QUERY-CONSOLE-LOG-STREAM-SERVICE"
                                      :environment environment
                                      :limit console-limit
                                      :type nil
                                      :source nil))))
         (when (or family visibility)
           (setf events-response
                 (sbcl-agent-call "QUERY-SERVICE-EVENT-STREAM"
                                  :environment environment
                                  :after-cursor nil
                                  :limit event-limit
                                  :family family
                                  :visibility visibility)))
         (sbcl-agent-call "MAKE-SERVICE-QUERY-RESPONSE"
                          :observation
                          :transcript-workspace
                          (list :events (if events-response
                                            (service-data events-response)
                                            (list :events '()))
                                :environment-console (and environment-console-response
                                                          (service-data environment-console-response)))
                          :metadata
                          (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                           :authority :environment
                                           :read-model :transcript-workspace-v1
                                           :environment environment))))
      ((string= operation "conversation.turn-detail")
       (let ((request-id (request-object-value request-json "turnId")))
         (sbcl-agent-call "QUERY-CONVERSATION-TURN-DETAIL-SERVICE"
                          (bridge-session environment)
                          request-id)))
      ((string= operation "memory.list")
       (sbcl-agent-call "QUERY-MEMORY-LIST-SERVICE"
                        (bridge-session environment)))
      ((string= operation "memory.detail")
       (let ((request-id (request-object-value request-json "memoryId")))
         (sbcl-agent-call "QUERY-MEMORY-DETAIL-SERVICE"
                          (bridge-session environment)
                          request-id)))
      ((string= operation "memory.update")
       (let* ((session (bridge-session environment))
              (memory-id (request-object-value request-json "memoryId"))
              (category (request-object-value request-json "category"))
              (attribute (request-object-value request-json "attribute"))
              (value (request-object-value request-json "value"))
              (summary (request-object-value request-json "summary"))
              (confidence (request-object-value request-json "confidence")))
         (unless memory-id
           (error "memory.update requires a memoryId payload"))
         (sbcl-agent-call "COMMAND-MEMORY-UPDATE-SERVICE"
                          session
                          memory-id
                          :category category
                          :attribute attribute
                          :value value
                          :summary summary
                          :confidence confidence)))
      ((string= operation "memory.delete")
       (let* ((session (bridge-session environment))
              (memory-id (request-object-value request-json "memoryId")))
         (unless memory-id
           (error "memory.delete requires a memoryId payload"))
         (sbcl-agent-call "COMMAND-MEMORY-DELETE-SERVICE"
                          session
                          memory-id)))
      ((string= operation "artifact.list")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "MAKE-SERVICE-QUERY-RESPONSE"
                          :artifact
                          :list
                          (service-data
                           (sbcl-agent-call "QUERY-RGP-ARTIFACTS-SERVICE" session environment))
                          :metadata
                          (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                           :authority :environment
                                           :read-model :artifact-list-v1
                                           :session session))))
      ((string= operation "artifact.detail")
       (let* ((session (bridge-session environment))
              (request-id (request-object-value request-json "artifactId"))
              (record (and request-id
                           (sbcl-agent-call "ENVIRONMENT-FIND-ARTIFACT-RECORD" environment request-id))))
         (unless record
           (error "Unknown artifact ~A" request-id))
         (sbcl-agent-call "MAKE-SERVICE-QUERY-RESPONSE"
                          :artifact
                          :detail
                          (append record
                                  (list :lineage (list :source-ref (getf record :source-ref)
                                                       :image-ref (getf record :image-ref)
                                                       :work-item-id (getf record :work-item-id))
                                        :governance-scope (if (getf record :thread-id)
                                                              :thread
                                                              :environment)))
                          :metadata
                          (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                           :authority :environment
                                           :read-model :artifact-detail-v1
                                           :session session))))
      ((string= operation "approval.list")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "MAKE-SERVICE-QUERY-RESPONSE"
                          :approval
                          :list
                          (remove-if-not
                           (lambda (item)
                             (eq (getf item :wait-reason) :approval-required))
                           (service-data
                            (sbcl-agent-call "QUERY-RGP-APPROVALS-SERVICE" session environment)))
                          :metadata
                          (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                           :authority :environment
                                           :read-model :approval-list-v1
                                           :session session))))
      ((string= operation "approval.detail")
       (let* ((session (bridge-session environment))
              (request-id (request-object-value request-json "requestId"))
              (work-item (and request-id
                              (sbcl-agent-call "FIND-WORK-ITEM" session request-id)))
              (workflow-record (and work-item
                                    (sbcl-agent-call "WORK-ITEM-WORKFLOW-RECORD" session work-item))))
         (unless work-item
           (error "Unknown approval request ~A" request-id))
         (sbcl-agent-call "MAKE-SERVICE-QUERY-RESPONSE"
                          :approval
                          :detail
                          (list :id request-id
                                :wait (service-data
                                       (sbcl-agent-call "QUERY-WORK-ITEM-WAIT-SERVICE" session request-id))
                                :work-item (service-data
                                            (sbcl-agent-call "QUERY-WORK-ITEM-DETAIL-SERVICE" session request-id))
                                :workflow-record (and workflow-record
                                                      (service-data
                                                       (sbcl-agent-call "QUERY-WORKFLOW-RECORD-DETAIL-SERVICE"
                                                                        session
                                                                        (sbcl-agent-call "WORKFLOW-RECORD-ID"
                                                                                         workflow-record)))))
                          :metadata
                          (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                           :authority :environment
                                           :read-model :approval-detail-v1
                                           :session session
                                           :work-item-id request-id))))
      ((string= operation "approval.approve")
       (let* ((session (bridge-session environment))
              (request-id (request-object-value request-json "requestId"))
              (work-item (and request-id
                              (sbcl-agent-call "FIND-WORK-ITEM" session request-id)))
              (requirement (and work-item
                                (first-approval-requirement session work-item)))
              (policy (and requirement (getf requirement :policy)))
              (workflow-record (and work-item
                                    (sbcl-agent-call "WORK-ITEM-WORKFLOW-RECORD" session work-item)))
              (resume-payload (and work-item
                                   (sbcl-agent-call "WORK-ITEM-RESUME-PAYLOAD" work-item)))
              (resume-command (and (listp resume-payload)
                                   (getf resume-payload :resume-command)))
              (resume-command-name
                (cond
                  ((keywordp resume-command)
                   resume-command)
                  ((and (consp resume-command) (symbolp (first resume-command)))
                   (first resume-command))
                  ((and (consp resume-command) (stringp (first resume-command)))
                   (intern (string-upcase (substitute #\- #\_ (first resume-command))) "KEYWORD"))
                  ((stringp resume-command)
                   (intern (string-upcase (substitute #\- #\_ resume-command)) "KEYWORD"))
                  (t nil)))
              (mutation-intent (and work-item
                                    (sbcl-agent-call "WORK-ITEM-MUTATION-INTENT" work-item)))
              (resume-turn-id (or (and (listp resume-payload)
                                       (getf resume-payload :turn-id))
                                  (and (listp mutation-intent)
                                       (string= (string-downcase (symbol-name (or (getf mutation-intent :source) :none)))
                                                "conversation-turn")
                                       (getf mutation-intent :turn-id))))
              (resume-through-turn-p (not (null resume-turn-id))))
         (unless work-item
           (error "Unknown approval request ~A" request-id))
         (unless policy
           (error "Approval request ~A does not expose a policy requirement" request-id))
         (sbcl-agent-call "COMMAND-APPROVE-POLICY-SERVICE" session policy)
         (if resume-through-turn-p
             (sbcl-agent-call "EXECUTE-COMMAND"
                              (sbcl-agent-call "NORMALIZE-FORM-COMMAND"
                                               (if resume-turn-id
                                                   (list 'turn/resume resume-turn-id)
                                                   '(turn/resume)))
                              (current-provider-for-prompt environment
                                                           session
                                                           (or (and work-item (sbcl-agent-call "WORK-ITEM-GOAL" work-item))
                                                               "Resume governed conversation work")
                                                           '())
                              session)
             (sbcl-agent-call "COMMAND-WORK-ITEM-RESUME-SERVICE"
                              session
                              request-id
                              :note "Resumed from desktop approval workspace."))
         (sbcl-agent-call "MAKE-SERVICE-COMMAND-RESPONSE"
                          :approval
                          :approve
                          (list :request-id request-id
                                :decision :approved
                                :summary "Approval granted. Governed work resumed in the live environment."
                                :resumed-entity-ids (remove nil
                                                            (list request-id
                                                                  (and workflow-record
                                                                       (sbcl-agent-call "WORKFLOW-RECORD-ID" workflow-record))
                                                                  resume-turn-id)))
                          :metadata
                          (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                           :authority :environment
                                           :command-model :approval-command-v1
                                           :session session
                                           :work-item-id request-id
                                           :policy-id policy))))
      ((string= operation "approval.deny")
       (let* ((session (bridge-session environment))
              (request-id (request-object-value request-json "requestId"))
              (work-item (and request-id
                              (sbcl-agent-call "FIND-WORK-ITEM" session request-id))))
         (unless work-item
           (error "Unknown approval request ~A" request-id))
         (sbcl-agent-call "COMMAND-WORK-ITEM-QUARANTINE-SERVICE"
                          session
                          request-id
                          "Approval denied in desktop approval workspace.")
         (sbcl-agent-call "MAKE-SERVICE-COMMAND-RESPONSE"
                          :approval
                          :deny
                          (list :request-id request-id
                                :decision :denied
                                :summary "Approval denied. The work item was quarantined for operator review."
                                :resumed-entity-ids '())
                          :metadata
                          (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                           :authority :environment
                                           :command-model :approval-command-v1
                                           :session session
                                           :work-item-id request-id))))
      ((string= operation "incident.list")
       (sbcl-agent-call "QUERY-INCIDENT-LIST-SERVICE" (bridge-session environment)))
      ((string= operation "incident.create")
       (let* ((session (bridge-session environment))
              (title (request-object-value request-json "title"))
              (summary (request-object-value request-json "summary"))
              (kind (or (keywordish (request-object-value request-json "kind"))
                        :runtime-condition))
              (status (or (keywordish (request-object-value request-json "status"))
                          :open)))
         (unless title
           (error "incident.create requires a title payload"))
         (unless summary
           (error "incident.create requires a summary payload"))
         (let ((incident (sbcl-agent-call "CREATE-INCIDENT"
                                          session
                                          kind
                                          title
                                          summary
                                          :status status
                                          :metadata (list :source :desktop-bridge
                                                          :kind kind))))
           (sbcl-agent-call "MAKE-SERVICE-COMMAND-RESPONSE"
                            :incident
                            :create
                            (sbcl-agent-call "INCIDENT-DETAIL" session incident)
                            :metadata
                            (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                             :authority :environment
                                             :command-model :incident-command-v1
                                             :session session
                                             :incident-id (sbcl-agent-call "INCIDENT-ID" incident))))))
      ((string= operation "incident.detail")
       (let ((request-id (request-object-value request-json "incidentId")))
         (sbcl-agent-call "QUERY-INCIDENT-DETAIL-SERVICE" (bridge-session environment) request-id)))
      ((string= operation "incident.set-remediation-plan")
       (let* ((session (bridge-session environment))
              (incident-id (request-object-value request-json "incidentId"))
              (remediation-plan-object (request-object-value request-json "remediationPlan"))
              (remediation-plan (if (and (listp remediation-plan-object)
                                         (every #'consp remediation-plan-object))
                                    (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" remediation-plan-object)
                                    '())))
         (unless incident-id
           (error "incident.set-remediation-plan requires an incidentId payload"))
         (unless remediation-plan-object
           (error "incident.set-remediation-plan requires a remediationPlan payload"))
         (sbcl-agent-call "COMMAND-INCIDENT-REMEDIATION-PLAN-SERVICE"
                          session
                          incident-id
                          remediation-plan)))
      ((string= operation "intent.create")
       (let* ((session (bridge-session environment))
              (description (request-object-value request-json "description"))
              (scope-object (request-object-value request-json "scope"))
              (constraints-object (request-object-value request-json "constraints"))
              (expected-behaviors (request-object-value request-json "expectedBehaviors"))
              (non-goals (request-object-value request-json "nonGoals"))
              (priority (request-object-value request-json "priority"))
              (version (request-object-value request-json "version"))
              (status-string (request-object-value request-json "status"))
              (linked-runtime-objects (request-object-value request-json "linkedRuntimeObjects"))
              (linked-source-artifacts (request-object-value request-json "linkedSourceArtifacts"))
              (linked-event-ids (request-object-value request-json "linkedEventIds"))
              (linked-mutation-ids (request-object-value request-json "linkedMutationIds"))
              (metadata-object (request-object-value request-json "metadata"))
              (scope (if (and (listp scope-object) (every #'consp scope-object))
                         (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" scope-object)
                         '()))
              (constraints (if (listp constraints-object)
                               (mapcar (lambda (entry)
                                         (if (and (listp entry) (every #'consp entry))
                                             (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" entry)
                                             entry))
                                       constraints-object)
                               '()))
              (metadata (if (and (listp metadata-object) (every #'consp metadata-object))
                            (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" metadata-object)
                            '()))
              (status (and status-string
                           (find-symbol (string-upcase status-string) "KEYWORD"))))
         (unless description
           (error "intent.create requires a description payload"))
         (sbcl-agent-call "COMMAND-INTENT-CREATE-SERVICE"
                          session
                          :description description
                          :scope scope
                          :constraints constraints
                          :expected-behaviors expected-behaviors
                          :non-goals non-goals
                          :priority (and priority
                                         (find-symbol (string-upcase priority) "KEYWORD"))
                          :version version
                          :status status
                          :linked-runtime-objects linked-runtime-objects
                          :linked-source-artifacts linked-source-artifacts
                          :linked-event-ids linked-event-ids
                          :linked-mutation-ids linked-mutation-ids
                          :metadata metadata)))
      ((string= operation "project.list")
       (sbcl-agent-call "QUERY-PROJECT-LIST-SERVICE" (bridge-session environment)))
      ((string= operation "project.detail")
       (let ((project-id (request-object-value request-json "projectId")))
         (sbcl-agent-call "QUERY-PROJECT-DETAIL-SERVICE" (bridge-session environment) project-id)))
      ((string= operation "project.testing-harness-inventory")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "MAKE-SERVICE-QUERY-RESPONSE"
                          :project
                          :testing-harness-inventory
                          (sbcl-agent-call "TESTING-HARNESS-INVENTORY")
                          :metadata
                          (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                           :authority :environment
                                           :read-model :testing-harness-inventory-v1
                                           :session session))))
      ((string= operation "project.create")
       (let* ((session (bridge-session environment))
              (title (request-object-value request-json "title"))
              (summary (request-object-value request-json "summary")))
         (unless title
           (error "project.create requires a title payload"))
         (sbcl-agent-call "COMMAND-PROJECT-CREATE-SERVICE"
                          session
                          :title title
                          :summary summary)))
      ((string= operation "project.set-constitution")
       (let* ((session (bridge-session environment))
              (project-id (request-object-value request-json "projectId"))
              (constitution-object (request-object-value request-json "constitution"))
              (constitution (if (and (listp constitution-object)
                                     (every #'consp constitution-object))
                                (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" constitution-object)
                                '())))
         (sbcl-agent-call "COMMAND-PROJECT-CONSTITUTION-SERVICE"
                          session
                          constitution
                          :project-id project-id)))
      ((string= operation "project.set-design-system")
       (let* ((session (bridge-session environment))
              (project-id (request-object-value request-json "projectId"))
              (design-system-object (request-object-value request-json "designSystem"))
              (design-system (if (and (listp design-system-object)
                                      (every #'consp design-system-object))
                                 (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" design-system-object)
                                 '())))
         (sbcl-agent-call "COMMAND-PROJECT-DESIGN-SYSTEM-SERVICE"
                          session
                          design-system
                          :project-id project-id)))
      ((string= operation "project.set-style-guide")
       (let* ((session (bridge-session environment))
              (project-id (request-object-value request-json "projectId"))
              (style-guide-object (request-object-value request-json "styleGuide"))
              (style-guide (if (and (listp style-guide-object)
                                    (every #'consp style-guide-object))
                               (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" style-guide-object)
                               '())))
         (sbcl-agent-call "COMMAND-PROJECT-STYLE-GUIDE-SERVICE"
                          session
                          style-guide
                          :project-id project-id)))
      ((string= operation "project.set-testing-strategy")
       (let* ((session (bridge-session environment))
              (project-id (request-object-value request-json "projectId"))
              (testing-strategy-object (request-object-value request-json "testingStrategy"))
              (testing-strategy (if (and (listp testing-strategy-object)
                                         (every #'consp testing-strategy-object))
                                    (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" testing-strategy-object)
                                    '())))
         (sbcl-agent-call "COMMAND-PROJECT-TESTING-STRATEGY-SERVICE"
                          session
                          testing-strategy
                          :project-id project-id)))
      ((string= operation "project.set-release-readiness")
       (let* ((session (bridge-session environment))
              (project-id (request-object-value request-json "projectId"))
              (release-readiness-object (request-object-value request-json "releaseReadiness"))
              (release-readiness (if (and (listp release-readiness-object)
                                          (every #'consp release-readiness-object))
                                     (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" release-readiness-object)
                                     '())))
         (sbcl-agent-call "COMMAND-PROJECT-RELEASE-READINESS-SERVICE"
                          session
                          release-readiness
                          :project-id project-id)))
      ((string= operation "project.set-readiness-obligations")
       (let* ((session (bridge-session environment))
              (project-id (request-object-value request-json "projectId"))
              (readiness-obligations-raw (request-object-value request-json "readinessObligations"))
              (readiness-obligations
                (if (listp readiness-obligations-raw)
                    (mapcar (lambda (entry)
                              (if (and (listp entry) (every #'consp entry))
                                  (sbcl-agent-call "JSON-OBJECT->KEYWORD-PLIST" entry)
                                  '()))
                            readiness-obligations-raw)
                    '())))
         (sbcl-agent-call "COMMAND-PROJECT-READINESS-OBLIGATIONS-SERVICE"
                          session
                          readiness-obligations
                          :project-id project-id)))
      ((string= operation "project.append-requirement")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "COMMAND-PROJECT-REQUIREMENT-SERVICE"
                          session
                          :project-id (request-object-value request-json "projectId")
                          :id (request-object-value request-json "id")
                          :title (request-object-value request-json "title")
                          :summary (request-object-value request-json "summary")
                          :scope (request-object-value request-json "scope")
                          :kind (keywordish (request-object-value request-json "kind"))
                          :priority (keywordish (request-object-value request-json "priority"))
                          :status (keywordish (request-object-value request-json "status"))
                          :verification-kind (keywordish (request-object-value request-json "verificationKind"))
                          :linked-artifact-ids (request-object-value request-json "linkedArtifactIds")
                          :non-functional-p (request-object-value request-json "nonFunctional"))))
      ((string= operation "project.append-feature-specification")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "COMMAND-PROJECT-FEATURE-SPEC-SERVICE"
                          session
                          :project-id (request-object-value request-json "projectId")
                          :id (request-object-value request-json "id")
                          :title (request-object-value request-json "title")
                          :summary (request-object-value request-json "summary")
                          :status (keywordish (request-object-value request-json "status"))
                          :acceptance-criteria (request-object-value request-json "acceptanceCriteria")
                          :linked-requirement-ids (request-object-value request-json "linkedRequirementIds")
                          :linked-journey-ids (request-object-value request-json "linkedJourneyIds"))))
      ((string= operation "project.append-user-journey")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "COMMAND-PROJECT-USER-JOURNEY-SERVICE"
                          session
                          :project-id (request-object-value request-json "projectId")
                          :id (request-object-value request-json "id")
                          :title (request-object-value request-json "title")
                          :summary (request-object-value request-json "summary")
                          :actors (request-object-value request-json "actors")
                          :entrypoints (request-object-value request-json "entrypoints")
                          :steps (request-object-value request-json "steps")
                          :outcomes (request-object-value request-json "outcomes")
                          :edge-cases (request-object-value request-json "edgeCases"))))
      ((string= operation "project.append-architecture-decision")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "COMMAND-PROJECT-ARCHITECTURE-DECISION-SERVICE"
                          session
                          :project-id (request-object-value request-json "projectId")
                          :id (request-object-value request-json "id")
                          :title (request-object-value request-json "title")
                          :status (keywordish (request-object-value request-json "status"))
                          :summary (request-object-value request-json "summary")
                          :drivers (request-object-value request-json "drivers")
                          :consequences (request-object-value request-json "consequences")
                          :stack-choices (request-object-value request-json "stackChoices")
                          :linked-requirement-ids (request-object-value request-json "linkedRequirementIds"))))
      ((string= operation "project.bind-testing-harness")
       (let ((session (bridge-session environment))
             (harness-id (keywordish (request-object-value request-json "harnessId"))))
         (unless harness-id
           (error "project.bind-testing-harness requires a harnessId payload"))
         (sbcl-agent-call "COMMAND-PROJECT-BIND-TESTING-HARNESS-SERVICE"
                          session
                          harness-id
                          :project-id (request-object-value request-json "projectId"))))
      ((string= operation "project.append-source-root")
       (let* ((session (bridge-session environment))
              (source-root (request-object-value request-json "sourceRoot")))
         (unless source-root
           (error "project.append-source-root requires a sourceRoot payload"))
         (sbcl-agent-call "COMMAND-PROJECT-SOURCE-ROOT-SERVICE"
                          session
                          source-root
                          :project-id (request-object-value request-json "projectId"))))
      ((string= operation "project.append-quality-gate")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "COMMAND-PROJECT-QUALITY-GATE-SERVICE"
                          session
                          :project-id (request-object-value request-json "projectId")
                          :id (request-object-value request-json "id")
                          :title (request-object-value request-json "title")
                          :summary (request-object-value request-json "summary")
                          :status (keywordish (request-object-value request-json "status"))
                          :required-harness-ids (keywordish-list (request-object-value request-json "requiredHarnessIds"))
                          :minimum-linked-work-items (request-object-value request-json "minimumLinkedWorkItems")
                          :minimum-linked-incidents (request-object-value request-json "minimumLinkedIncidents")
                          :require-source-roots-p (request-object-value request-json "requireSourceRoots")
                          :required-trace-target-kinds (keywordish-list (request-object-value request-json "requiredTraceTargetKinds"))
                          :maximum-failed-tests (request-object-value request-json "maximumFailedTests")
                          :require-coverage-p (request-object-value request-json "requireCoverage")
                          :maximum-say-turn-latency-seconds (request-object-value request-json "maximumSayTurnLatencySeconds")
                          :maximum-environment-save-load-seconds (request-object-value request-json "maximumEnvironmentSaveLoadSeconds")
                          :require-recovery-ready-p (request-object-value request-json "requireRecoveryReady"))))
      ((string= operation "project.bind-incident")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "COMMAND-PROJECT-BIND-INCIDENT-SERVICE"
                          session
                          (request-object-value request-json "incidentId")
                          :project-id (request-object-value request-json "projectId"))))
      ((string= operation "work-item.list")
       (sbcl-agent-call "QUERY-WORK-ITEM-LIST-SERVICE" (bridge-session environment)))
      ((string= operation "work-item.detail")
       (let ((request-id (request-object-value request-json "workItemId")))
         (sbcl-agent-call "QUERY-WORK-ITEM-DETAIL-SERVICE" (bridge-session environment) request-id)))
      ((string= operation "work-item.plan")
       (let ((request-id (request-object-value request-json "workItemId")))
         (sbcl-agent-call "QUERY-WORK-ITEM-PLAN-SERVICE" (bridge-session environment) request-id)))
      ((string= operation "work-item.resume")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "COMMAND-WORK-ITEM-RESUME-SERVICE"
                          session
                          (request-object-value request-json "workItemId")
                          :note (request-object-value request-json "note"))))
      ((string= operation "work-item.quarantine")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "COMMAND-WORK-ITEM-QUARANTINE-SERVICE"
                          session
                          (request-object-value request-json "workItemId")
                          (or (request-object-value request-json "reason")
                              "Governed work item requires supervised quarantine."))))
      ((string= operation "work-item.rollback")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "COMMAND-WORK-ITEM-ROLLBACK-SERVICE"
                          session
                          (request-object-value request-json "workItemId")
                          :reason (request-object-value request-json "reason")
                          :note (request-object-value request-json "note"))))
      ((string= operation "work-item.complete-validations")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "COMMAND-WORK-ITEM-COMPLETE-VALIDATIONS-SERVICE"
                          session
                          (request-object-value request-json "workItemId")
                          :status (or (keywordish (request-object-value request-json "status"))
                                      :passed))))
      ((string= operation "work-item.steer")
       (let ((session (bridge-session environment)))
         (sbcl-agent-call "COMMAND-WORK-ITEM-STEER-SERVICE"
                          session
                          (request-object-value request-json "workItemId")
                          :phase (keywordish (request-object-value request-json "phase"))
                          :next-step (request-object-value request-json "nextStep")
                          :note (request-object-value request-json "note"))))
      ((string= operation "workflow.record-detail")
       (let ((request-id (request-object-value request-json "workflowRecordId")))
         (sbcl-agent-call "QUERY-WORKFLOW-RECORD-DETAIL-SERVICE" (bridge-session environment) request-id)))
      ((string= operation "events.stream")
       (sbcl-agent-call "QUERY-SERVICE-EVENT-STREAM"
        :environment environment
        :after-cursor (request-object-value request-json "afterCursor")
        :limit (or (request-object-value request-json "limit") 50)
        :family (keywordish (request-object-value request-json "family"))
        :visibility (keywordish (request-object-value request-json "visibility"))))
      (t
       (error "Unsupported live bridge operation ~A" operation)))))

(defun main ()
  (let* ((arguments (script-arguments))
         (project-dir (first arguments))
         (state-path-argument (second arguments))
         (operation (third arguments))
         (environment-id (fourth arguments))
         (request-json-argument (fifth arguments))
         (request-json (cond
                         ((and request-json-argument
                               (not (string= request-json-argument "-")))
                          request-json-argument)
                         (request-json-argument
                          (read-stdin-string))
                         (t
                          nil)))
         (project-root (project-directory-pathname project-dir))
         (state-path (file-pathname state-path-argument)))
    (unless (and project-dir state-path-argument operation)
      (error "Usage: live-service-bridge.lisp <sbcl-agent-project-dir> <state-path> <operation> [environment-id]"))
    (require :asdf)
    (setf *project-root* project-root)
    (load (merge-pathnames #P"src/bootstrap-runtime.lisp" project-root))
    (funcall (symbol-function
              (or (find-symbol "BOOTSTRAP-COMMON-LISP-PACKAGE-MANAGEMENT"
                               "SBCL-AGENT.BOOTSTRAP")
                  (error "Unable to resolve sbcl-agent bootstrap function.")))
             :project-dir project-root
             :working-directory project-root)
    (load (merge-pathnames #P"sbcl-agent.asd" project-root))
    (asdf-call "LOAD-SYSTEM" :sbcl-agent)
    (labels ((bridge-environment-for-request (request-operation request-environment-id)
               (if (and *bridge-environment*
                        (not (binding-transition-operation-p request-operation)))
                   *bridge-environment*
                   (setf *bridge-environment*
                         (load-or-create-bridge-environment
                          project-root
                          state-path
                          request-environment-id))))
             (execute-request (request-operation request-environment-id request-json-string)
               (let* ((environment (bridge-environment-for-request
                                    request-operation
                                    request-environment-id))
                      (response (handler-case
                                    (service-response-for environment
                                                          request-operation
                                                          request-environment-id
                                                          request-json-string)
                                  (error (condition)
                                    (format *error-output*
                                            "~&[live-bridge] request failure operation=~A type=~A message=~A~%"
                                            request-operation
                                            (type-of condition)
                                            (princ-to-string condition))
                                    (sbcl-agent-call "MAKE-SERVICE-RESPONSE"
                                                     :bridge
                                                     :failure
                                                     :command
                                                     (list :summary (princ-to-string condition)
                                                           :error (princ-to-string condition)
                                                           :operation request-operation)
                                                     :status :error
                                                     :metadata (sbcl-agent-call "MAKE-SERVICE-METADATA"
                                                                                :authority :environment
                                                                                :environment environment))))))
                 (let ((persisted-environment
                         (if (binding-transition-operation-p request-operation)
                             (handler-case
                                 (sbcl-agent-call "ENSURE-ENVIRONMENT")
                               (error ()
                                 environment))
                             environment)))
                   (handler-case
                       (progn
                         (setf *bridge-environment* persisted-environment)
                         (sbcl-agent-call "SAVE-ENVIRONMENT" persisted-environment state-path))
                     (error ()
                       nil)))
                 response))
             (emit-response (response)
               (if (string= operation "conversation.send-message-stream")
                   (emit-stream-frame :result response)
                   (write-string
                    (emit-request-json-string (json-friendly response))))))
      (when (serve-mode-p operation)
        (loop for line = (read-line *standard-input* nil nil)
              while line
              do (let ((trimmed (string-trim '(#\Space #\Tab #\Return #\Linefeed) line)))
                   (when (> (length trimmed) 0)
                     (let* ((frame (sbcl-agent-call "PARSE-JSON" trimmed))
                            (request-id (sbcl-agent-call "JSON-OBJECT-VALUE" frame "id"))
                            (request-operation (sbcl-agent-call "JSON-OBJECT-VALUE" frame "operation"))
                            (request-environment-id (sbcl-agent-call "JSON-OBJECT-VALUE" frame "environmentId"))
                            (request-payload-object (sbcl-agent-call "JSON-OBJECT-VALUE" frame "request"))
                            (request-payload-json
                              (when request-payload-object
                                (emit-request-json-string request-payload-object)))
                            (response
                              (execute-request request-operation
                                               request-environment-id
                                               request-payload-json)))
                       (write-line
                        (emit-request-json-string
                         (json-friendly
                          (list :id request-id
                                :response response))))
                       (finish-output)))))
        (return-from main nil))
      (emit-response
       (execute-request operation environment-id request-json)))))

(main)
