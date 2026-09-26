import type { Metadata } from 'next';
import { LegalIntro, LegalSection, LegalShell } from '@/components/legal/legal-shell';

export const metadata: Metadata = {
  title: 'Política de cookies | AgroMAS',
  description: 'Tipos de cookies y almacenamiento local que usa AgroMAS.',
};

const UPDATED = '26 de septiembre de 2026';

export default function CookiesPage() {
  return (
    <LegalShell kicker="Cookies" title="Política de cookies" updated={UPDATED}>
      <LegalIntro>
        Usamos cookies, almacenamiento local y tecnologías similares para que el sitio y el tablero funcionen, recordar
        tu sesión y, solo si lo autorizás, medir uso o campañas. Hoy el aviso guarda tu elección de forma persistente
        en este dispositivo. Las cookies de sesión del tablero ya existen porque el login las necesita. Analíticas y
        marketing quedan bloqueadas hasta que conectemos esas herramientas; no se carga ningún script extra sin tu
        permiso.
      </LegalIntro>

      <LegalSection title="1. Qué es una cookie">
        <p>
          Es un pequeño archivo que el navegador guarda en tu dispositivo. También usamos <em>localStorage</em> y
          <em> sessionStorage</em> para el token de acceso, el establecimiento activo y tu preferencia de cookies.
        </p>
      </LegalSection>

      <LegalSection title="2. Categorías">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Estrictamente necesarias:</strong> inicio de sesión (JWT y cookie HttpOnly de refresh), protección
            CSRF, “recordar sesión” y guardar tu elección de cookies. No se pueden desactivar sin romper el servicio.
          </li>
          <li>
            <strong>Analíticas (opt-in):</strong> si más adelante conectamos medición (por ejemplo visitas al sitio),
            solo se activará si aceptaste esta categoría. Hoy la preferencia se guarda; no hay píxel ni Google Analytics
            cargado.
          </li>
          <li>
            <strong>Marketing (opt-in):</strong> igual que analíticas: la categoría existe para cuando haya campañas.
            Sin consentimiento no se activa nada.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Cookies de terceros">
        <p>
          Si iniciás sesión con Google, ese proveedor puede colocar cookies propias. WhatsApp no se incrusta en el
          sitio; solo se usa como canal de alerta si lo configurás.
        </p>
      </LegalSection>

      <LegalSection title="4. Cómo gestionarlas">
        <p>
          En el aviso inicial podés aceptar todas, quedarte solo con las necesarias o configurar categorías. También
          podés borrar cookies desde tu navegador; si lo hacés, es posible que tengas que volver a iniciar sesión.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
