import type { Metadata } from 'next';
import { LegalIntro, LegalSection, LegalShell } from '@/components/legal/legal-shell';

export const metadata: Metadata = {
  title: 'Términos y condiciones | AgroMAS',
  description: 'Condiciones de uso de la plataforma AgroMAS.',
};

const UPDATED = '26 de septiembre de 2026';

export default function TerminosPage() {
  return (
    <LegalShell kicker="Legal" title="Términos y condiciones" updated={UPDATED}>
      <LegalIntro>
        Estos términos regulan el acceso y uso de AgroMAS, plataforma AgTech de riego de precisión operada por Nicolas
        Ferreyra y Luis Fredes (el “equipo”) en el marco de un Proyecto Final Integrador. Al crear una cuenta o usar el
        tablero, aceptás estas condiciones.
      </LegalIntro>

      <LegalSection title="1. El servicio">
        <p>
          AgroMAS combina imágenes Sentinel-2, balance hídrico FAO-56, clima georreferenciado y agentes de asistencia
          para ayudar a decidir el riego. Las recomendaciones son de apoyo a la decisión agronómica: no reemplazan el
          criterio profesional ni garantizan rendimientos, ahorros o ausencia de pérdidas.
        </p>
      </LegalSection>

      <LegalSection title="2. Cuenta y elegibilidad">
        <p>
          Tenés que ser mayor de 18 años y proporcionar datos veraces. Sos responsable de la confidencialidad de tu
          contraseña y de la actividad de los miembros que invites al establecimiento (administrador, agrónomo u
          operador), según los permisos asignados.
        </p>
      </LegalSection>

      <LegalSection title="3. Tu contenido y lotes">
        <p>
          Conservás los derechos sobre la información que cargás (geometrías de lotes, cultivos, riegos, lluvias,
          datos de equipo). Nos otorgás una licencia limitada para procesarla y mostrarla en el tablero, calcular el
          balance hídrico y generar alertas. No revendemos tu cartografía ni tus datos operativos a terceros con fines
          ajenos al servicio.
        </p>
      </LegalSection>

      <LegalSection title="4. Fuentes externas">
        <p>
          El sistema consulta proveedores de satélite, clima e infraestructura (por ejemplo Sentinel-2, Open-Meteo,
          NASA POWER y, si usás Google o WhatsApp, esos servicios). Su disponibilidad, latencia o calidad pueden
          variar y no están bajo nuestro control total.
        </p>
      </LegalSection>

      <LegalSection title="5. Uso aceptable">
        <p>
          No está permitido intentar acceder a cuentas o establecimientos ajenos, interferir con la plataforma, usar el
          servicio para fines ilícitos o extraer de forma masiva datos o imágenes más allá de lo necesario para operar
          tu campo.
        </p>
      </LegalSection>

      <LegalSection title="6. Planes y disponibilidad">
        <p>
          El plan gratuito y los planes pagos se describen en el sitio. Podemos modificar funcionalidades con aviso
          razonable. El servicio se ofrece “tal cual”, con el esfuerzo de mantenerlo operativo, pero pueden existir
          cortes por mantenimiento o de proveedores.
        </p>
      </LegalSection>

      <LegalSection title="7. Limitación de responsabilidad">
        <p>
          En la máxima medida permitida por la ley argentina, el equipo no responde por daños indirectos, lucro
          cesante o decisiones de riego tomadas a partir de las recomendaciones. La responsabilidad total, si
          correspondiera, se limita a lo efectivamente abonado en los últimos 12 meses o, si el uso es gratuito, a un
          monto simbólico razonable.
        </p>
      </LegalSection>

      <LegalSection title="8. Ley aplicable">
        <p>
          Estos términos se rigen por las leyes de la República Argentina. Cualquier controversia se dirime en los
          tribunales competentes de la Provincia de Río Negro, sin perjuicio de derechos irrenunciables del consumidor
          si resultaran aplicables.
        </p>
      </LegalSection>

      <LegalSection title="9. Contacto">
        <p>
          Consultas: escribí a{' '}
          <a className="font-bold text-crop-700" href="mailto:nicoferreyra.work@gmail.com">
            nicoferreyra.work@gmail.com
          </a>
          . Valle Inferior, Río Negro, Argentina.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
