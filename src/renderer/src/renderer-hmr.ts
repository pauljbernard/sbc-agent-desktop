export function installFullReloadOnHotUpdate(): void {
  if (import.meta.hot) {
    import.meta.hot.accept(() => {
      window.location.reload();
    });
  }
}
