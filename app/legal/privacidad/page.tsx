import type { Metadata } from 'next';
import { LegalIntro, LegalSection, LegalShell } from '@/components/legal/legal-shell';

export const metadata: Metadata = {
  title: 'Política de privacidad | AgroMAS',
  description: 'Cómo AgroMAS trata tus datos personales y de establecimiento.',
};

const UPDATED = '26 de septiembre de 2026';

export default function PrivacidadPage() {
  return (
    <LegalShell kicker="Legal" title="Política de privacidad" updated={UPDATED}>
      <LegalIntro>
        Esta política describe qué datos trata AgroMAS, con qué finalidad y qué derechos tenés según la Ley 25.326 de
        Protección de Datos Personales de Argentina y buenas prácticas internacionales (minimización, seguridad y
        transparencia).
      </LegalIntro>

      <LegalSection title="1. Responsable">
        <p>
          El tratamiento lo realiza el equipo de AgroMAS (Nicolas Ferreyra y Luis Fredes). Contacto de privacidad:{' '}
          <a className="font-bold text-crop-700" href="mailto:nicoferreyra.work@gmail.com">
            nicoferreyra.work@gmail.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Datos que recopilamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Identidad y contacto: nombre, apellido, email, teléfono WhatsApp.</li>
          <li>Cuenta: contraseña hasheada, rol, autenticación con Google si la elegís.</li>
          <li>Establecimiento: nombre, geometrías de lotes, cultivo, suelo, sistema de riego, fechas fenológicas.</li>
          <li>Operación: riegos y lluvias cargados, historial hídrico, snapshots de agentes, alertas.</li>
          <li>Uso técnico: logs de seguridad, dirección IP aproximada, tipo de dispositivo y cookies (ver política de cookies).</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalidades">
        <p>
          Crear y administrar tu cuenta; calcular el balance FAO-56 y mostrar NDVI; enviar alertas al tablero y, si
          cargaste WhatsApp, al teléfono; invitar colaboradores; mejorar el producto; cumplir obligaciones legales.
          El envío de novedades comerciales solo ocurre si lo autorizaste en el alta o más adelante.
        </p>
      </LegalSection>

      <LegalSection title="4. Encargados y transferencias">
        <p>
          Podemos usar infraestructura en la nube (hosting, base de datos, autenticación) y APIs de satélite, clima y
          mensajería. Google trata tu identidad si iniciás sesión con esa cuenta. WhatsApp/Meta interviene si activás
          alertas por ese canal. Esos proveedores aplican sus propias políticas.
        </p>
      </LegalSection>

      <LegalSection title="5. Conservación y seguridad">
        <p>
          Guardamos los datos mientras la cuenta esté activa y el tiempo adicional necesario para auditorías o
          reclamos. Usamos HTTPS, tokens de sesión y control de acceso por roles. Ningún sistema es infalible: si
          detectamos un incidente relevante, te lo informaremos.
        </p>
      </LegalSection>

      <LegalSection title="6. Tus derechos">
        <p>
          Podés solicitar acceso, rectificación, actualización o supresión de tus datos personales, y oponerte o
          limitar ciertos tratamientos (por ejemplo, marketing). También podés revocar el consentimiento de cookies no
          necesarias. Para ejercerlos, escribinos al correo indicado. Tenés derecho a reclamar ante la Agencia de
          Acceso a la Información Pública (AAIP).
        </p>
      </LegalSection>

      <LegalSection title="7. Menores">
        <p>AgroMAS no está dirigido a menores de 18 años. Si detectamos una cuenta de un menor, la daremos de baja.</p>
      </LegalSection>
    </LegalShell>
  );
}
