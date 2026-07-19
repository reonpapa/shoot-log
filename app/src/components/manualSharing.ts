type ManualSharingNavigator = Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints">;

export function shouldUseManualShareSheet(device: ManualSharingNavigator) {
  return /iPad|iPhone|iPod/.test(device.userAgent)
    || (device.platform === "MacIntel" && device.maxTouchPoints > 1);
}
