import type { WebContents } from "electron";
import type { EnvironmentEventDto, EventSubscriptionInput } from "../../shared/contracts";

interface EventSubscriptionRecord {
  input: EventSubscriptionInput;
  sender: WebContents;
}

export class DesktopEventBroker {
  private eventSubscriptions = new Map<string, EventSubscriptionRecord>();
  private nextSubscriptionId = 1;

  private eventMatchesSubscription(
    event: EnvironmentEventDto,
    input: EventSubscriptionInput
  ): boolean {
    if (input.families && input.families.length > 0 && !input.families.includes(event.family)) {
      return false;
    }

    if (input.visibility && input.visibility.length > 0) {
      const visibility = event.visibility ?? "operator";
      if (!input.visibility.includes(visibility)) {
        return false;
      }
    }

    if (input.fromCursor !== undefined && event.cursor < input.fromCursor) {
      return false;
    }

    return true;
  }

  emit(event: EnvironmentEventDto): void {
    for (const [subscriptionId, record] of this.eventSubscriptions.entries()) {
      if (!this.eventMatchesSubscription(event, record.input) || record.sender.isDestroyed()) {
        continue;
      }

      record.sender.send("events:subscription-event", {
        subscriptionId,
        event
      });
    }
  }

  subscribe(sender: WebContents, input: EventSubscriptionInput): { subscriptionId: string } {
    const subscriptionId = `subscription-${this.nextSubscriptionId++}`;
    this.eventSubscriptions.set(subscriptionId, {
      input,
      sender
    });
    return { subscriptionId };
  }

  unsubscribe(subscriptionId: string): void {
    this.eventSubscriptions.delete(subscriptionId);
  }
}
