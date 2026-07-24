import { z } from 'zod';

/**
 * Validador de UUID flexible.
 *
 * A diferencia de `z.string().uuid()` de Zod 4, que aplica el RFC 4122
 * estricto (rechazando IDs seedeados manualmente como
 * `11111111-1111-1111-1111-111111111111` porque el 4º grupo no empieza
 * con 8/9/a/b), este validador acepta cualquier string con formato
 * `8-4-4-4-12` en hex. La existencia real del registro la valida la
 * base de datos mediante la FK constraint.
 */
export const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuidLike = (message = 'Identificador inválido') =>
  z.string().regex(UUID_LIKE, message);
