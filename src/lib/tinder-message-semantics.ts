/**
 * Tinder's exported Messages collection contains uploader-authored messages.
 * The numeric `to` value is a provider-local match reference, not direction.
 */
export function getTinderExportMessageAuthor(
  _providerMatchReference: number,
): "USER" {
  return "USER";
}
