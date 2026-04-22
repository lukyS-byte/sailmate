import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Zpět
          </button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-ocean-500/10 flex items-center justify-center flex-shrink-0">
            <Shield size={20} className="text-ocean-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-800 dark:text-white">Ochrana osobních údajů</h1>
            <p className="text-sm text-slate-400">Zásady zpracování osobních údajů dle GDPR</p>
          </div>
        </div>

        <div className="space-y-6">

          {/* Správce dat */}
          <section className="card">
            <h2 className="text-base font-semibold text-navy-800 dark:text-white mb-2">1. Správce osobních údajů</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Správcem osobních údajů je provozovatel aplikace <strong>SailMate</strong>. V případě dotazů ohledně zpracování osobních údajů nás kontaktujte na adrese{' '}
              <a href="mailto:privacy@sailmate.app" className="text-ocean-500 hover:underline">privacy@sailmate.app</a>.
            </p>
          </section>

          {/* Jaká data */}
          <section className="card">
            <h2 className="text-base font-semibold text-navy-800 dark:text-white mb-2">2. Jaké osobní údaje zpracováváme</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              V rámci provozu aplikace SailMate zpracováváme následující kategorie údajů:
            </p>
            <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                <span><strong>Identifikační údaje:</strong> e-mailová adresa, jméno uživatele</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                <span><strong>Data o výpravách:</strong> název výpravy, informace o lodi, datumy plavby</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                <span><strong>Data posádky:</strong> jména členů posádky</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                <span><strong>Finanční data:</strong> záznamy o nákladech, rozúčtování výdajů</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                <span><strong>Navigační data:</strong> trasy plavby, waypoints, zastávky</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                <span><strong>Záznamy z lodního deníku:</strong> plavební záznamy, poznámky</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                <span><strong>Regaty:</strong> záznamy o závodech, výsledky</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                <span><strong>Fotografie:</strong> snímky zastávek a míst z výprav</span>
              </li>
            </ul>
          </section>

          {/* Právní základ */}
          <section className="card">
            <h2 className="text-base font-semibold text-navy-800 dark:text-white mb-2">3. Právní základ zpracování</h2>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <p>
                <strong>Souhlas uživatele (čl. 6 odst. 1 písm. a) GDPR):</strong> Zpracování osobních údajů provádíme na základě vašeho výslovného souhlasu, který udělujete při registraci do aplikace.
              </p>
              <p>
                <strong>Plnění smlouvy (čl. 6 odst. 1 písm. b) GDPR):</strong> Část zpracování je nezbytná pro poskytování služby SailMate — tj. pro provoz vašeho účtu a funkce aplikace (lodní deník, správa výprav, sdílení s posádkou).
              </p>
            </div>
          </section>

          {/* Příjemci dat */}
          <section className="card">
            <h2 className="text-base font-semibold text-navy-800 dark:text-white mb-2">4. Příjemci a předání dat</h2>
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <p>
                Vaše data jsou ukládána prostřednictvím platformy <strong>Supabase Inc.</strong> (USA). Předání dat do USA probíhá v souladu s GDPR na základě standardních smluvních doložek (SCC) dle čl. 46 GDPR.
              </p>
              <p>
                Data jsou fyzicky uložena v datovém centru v <strong>EU — Frankfurt (eu-central-1)</strong>. Supabase je pouze zpracovatelem, nikoli správcem vašich dat.
              </p>
              <p>
                Data nejsou předávána žádným dalším třetím stranám za účelem marketingu, reklamy ani profilování.
              </p>
            </div>
          </section>

          {/* Doba uchovávání */}
          <section className="card">
            <h2 className="text-base font-semibold text-navy-800 dark:text-white mb-2">5. Doba uchovávání dat</h2>
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <p>
                Vaše osobní údaje uchováváme po dobu existence vašeho účtu v aplikaci SailMate.
              </p>
              <p>
                Po smazání účtu jsou <strong>všechna vaše data trvale a nevratně odstraněna</strong> ze všech systémů, a to bez zbytečného odkladu. Žádné zálohy osobních dat nejsou uchovávány.
              </p>
            </div>
          </section>

          {/* Práva subjektu */}
          <section className="card">
            <h2 className="text-base font-semibold text-navy-800 dark:text-white mb-3">6. Vaše práva (práva subjektu údajů)</h2>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <p>Jako subjekt údajů máte dle GDPR následující práva:</p>
              <ul className="space-y-1.5 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                  <span><strong>Právo na přístup (čl. 15):</strong> Právo získat potvrzení, zda zpracováváme vaše osobní údaje, a přístup k nim.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                  <span><strong>Právo na opravu (čl. 16):</strong> Právo na opravu nepřesných nebo neúplných osobních údajů.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                  <span><strong>Právo na výmaz — „být zapomenut" (čl. 17):</strong> Právo na smazání vašich osobních údajů za podmínek stanovených GDPR.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                  <span><strong>Právo na přenositelnost (čl. 20):</strong> Právo obdržet vaše data ve strukturovaném, strojově čitelném formátu (JSON export).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                  <span><strong>Právo na omezení zpracování (čl. 18):</strong> Právo požadovat omezení zpracování vašich osobních údajů.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                  <span><strong>Právo vznést námitku (čl. 21):</strong> Právo vznést námitku proti zpracování vašich osobních údajů.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Jak uplatnit práva */}
          <section className="card">
            <h2 className="text-base font-semibold text-navy-800 dark:text-white mb-2">7. Jak uplatnit svá práva</h2>
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <p>Svá práva můžete uplatnit dvěma způsoby:</p>
              <ul className="space-y-1.5 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                  <span><strong>Přímo v aplikaci:</strong> V sekci <em>Účet</em> (ikona nastavení v horní liště) najdete možnost exportovat svá data ve formátu JSON nebo trvale smazat svůj účet a všechna data.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                  <span><strong>E-mailem:</strong> Kontaktujte nás na{' '}
                    <a href="mailto:privacy@sailmate.app" className="text-ocean-500 hover:underline">privacy@sailmate.app</a>. Na vaši žádost odpovíme do 30 dnů.
                  </span>
                </li>
              </ul>
              <p className="mt-2">
                Máte také právo podat stížnost u dozorového úřadu — v ČR je jím <strong>Úřad pro ochranu osobních údajů (ÚOOÚ)</strong>, www.uoou.cz.
              </p>
            </div>
          </section>

          {/* Cookies / local storage */}
          <section className="card">
            <h2 className="text-base font-semibold text-navy-800 dark:text-white mb-2">8. Cookies a lokální úložiště</h2>
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <p>
                Aplikace SailMate používá <strong>výhradně technické cookies a lokální úložiště (localStorage)</strong> pro tyto účely:
              </p>
              <ul className="space-y-1.5 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                  <span>Udržení přihlášení (autentizační session)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                  <span>Lokální uložení dat pro offline použití (PWA)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ocean-500 mt-0.5 flex-shrink-0">•</span>
                  <span>Uložení preference tmavého/světlého režimu</span>
                </li>
              </ul>
              <p className="mt-2">
                <strong>Nepoužíváme žádné reklamní, sledovací ani analytické cookies.</strong> Data z lokálního úložiště nejsou sdílena s třetími stranami.
              </p>
            </div>
          </section>

          {/* Kontakt */}
          <section className="card">
            <h2 className="text-base font-semibold text-navy-800 dark:text-white mb-2">9. Kontakt</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Pro veškeré dotazy týkající se ochrany osobních údajů nás kontaktujte na:{' '}
              <a href="mailto:privacy@sailmate.app" className="text-ocean-500 hover:underline font-medium">privacy@sailmate.app</a>
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <p className="text-xs text-slate-400">Poslední aktualizace: 22. dubna 2026</p>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Zpět
          </button>
        </div>
      </div>
    </div>
  )
}
