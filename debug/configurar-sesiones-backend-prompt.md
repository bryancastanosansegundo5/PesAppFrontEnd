Necesito validar que el frontend ya ha quedado alineado con el contrato real del backend para la sincronizacion offline de `POST /api/sesiones-entrenamiento`.

Contrato confirmado por backend:
- El endpoint funciona como upsert por `clientId`.
- El backend busca por `clientId`, luego `id`, luego `idSesion`.
- Si no existe, crea.
- Si existe, actualiza.
- En altas nuevas no debemos enviar `version`.
- En ejercicios hijos nuevos tampoco debemos enviar `version`.
- `catalogoEjercicioId` solo puede enviarse si ya es un id numerico real persistido en backend.
- `alturaBanco` como string es valido.
- `clientId` se usa para idempotencia y trazabilidad.

Cambios aplicados ya en frontend:
1. Si la sesion aun no tiene `id` numerico persistido, el payload sale sin `version`.
2. Si un ejercicio aun no tiene `id` numerico persistido, el payload sale sin `version`.
3. `catalogoEjercicioId` solo se envia si su valor final es numerico.
4. Si `catalogoEjercicioId` sigue siendo slug o id temporal, se omite.
5. `fechaInicio` y `fechaFin` vacias salen como `null`.
6. El frontend sigue manteniendo `clientId` e `idEjercicio` temporales para idempotencia local.

Payload final esperado para una alta offline nueva:

```json
{
  "clientId": "sesion-1745955600000-a1b2c3d4",
  "nombreSesion": "Sesion offline prueba",
  "fechaInicio": null,
  "fechaFin": null,
  "ejercicios": [
    {
      "idEjercicio": "ejercicio-1745955600001-e1f2a3b4",
      "clientId": "ejercicio-1745955600001-e1f2a3b4",
      "nombre": "Press banca",
      "descripcion": "Press horizontal con control en la bajada y bloqueo estable.",
      "grupoMuscular": "Pecho",
      "patronMovimiento": "Empuje horizontal",
      "equipamiento": "Barra y banco",
      "seriesPlanificadas": 4,
      "repeticionesPlanificadas": 10,
      "pesoPlanificado": 60,
      "alturaBanco": "30",
      "agarre": "Medio"
    }
  ]
}
```

Payload final esperado si el ejercicio ya tiene `catalogoEjercicioId` reconciliado contra backend:

```json
{
  "clientId": "sesion-1745955600000-a1b2c3d4",
  "nombreSesion": "Sesion offline prueba",
  "fechaInicio": null,
  "fechaFin": null,
  "ejercicios": [
    {
      "idEjercicio": "ejercicio-1745955600001-e1f2a3b4",
      "clientId": "ejercicio-1745955600001-e1f2a3b4",
      "catalogoEjercicioId": "123",
      "nombre": "Press banca",
      "descripcion": "Press horizontal con control en la bajada y bloqueo estable.",
      "grupoMuscular": "Pecho",
      "patronMovimiento": "Empuje horizontal",
      "equipamiento": "Barra y banco",
      "seriesPlanificadas": 4,
      "repeticionesPlanificadas": 10,
      "pesoPlanificado": 60,
      "alturaBanco": "30",
      "agarre": "Medio"
    }
  ]
}
```

Quiero que me confirmes:
1. Que este payload ya es totalmente compatible con el backend actual.
2. Que un reintento con el mismo `clientId` y sin `version` en una alta aun no confirmada no provocara `409`.
3. Que si el backend devuelve el recurso creado con `id` y `version`, ese objeto ya puede reutilizarse despues en updates optimistas normales.
4. Que no queda ningun otro campo conflictivo en este contrato.
