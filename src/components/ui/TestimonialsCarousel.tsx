import { useState, useEffect } from 'react'

const TESTIMONIALS = [
  {
    text: "Suite à un important dégât des eaux, ALT'IN a su défendre nos intérêts avec professionnalisme. Grâce à leur expertise, nous avons obtenu une indemnisation bien supérieure à l'offre initiale de notre assureur.",
    name: "Marie D.",
    source: "Avis Google",
  },
  {
    text: "Très satisfait de l'accompagnement lors d'un sinistre incendie. Réactivité, rigueur et écoute tout au long du processus. Le rapport d'expertise a été décisif pour notre dossier. Je recommande vivement.",
    name: "Thomas L.",
    source: "Avis Google",
  },
  {
    text: "Hichame m'a accompagnée de A à Z dans mon litige avec l'assureur ne voulant pas prendre en charge mon sinistre sècheresse. Sa connaissance du secteur et son implication ont fait toute la différence. Un service d'une grande qualité.",
    name: "Isabelle M.",
    source: "Avis Google",
  },
  {
    text: "La formation proposée par ALT'IN est d'une grande qualité. Contenu complet, formateurs passionnés et très pédagogues. Elle m'a donné toutes les clés pour démarrer mon activité d'expert avec sérénité.",
    name: "Sophie R.",
    source: "Avis Google · Formation",
  },
  {
    text: "L'accompagnement terrain proposé par ALT'IN lors de mes premières expertises a été déterminant. Leurs conseils pratiques et leur disponibilité m'ont permis de monter rapidement en compétence.",
    name: "Nicolas B.",
    source: "Avis Google · Formation",
  },
]

export default function TestimonialsCarousel() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(i => (i + 1) % TESTIMONIALS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const prev = () => setCurrent(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
  const next = () => setCurrent(i => (i + 1) % TESTIMONIALS.length)

  const t = TESTIMONIALS[current]

  return (
    <section className="bg-paper-2 py-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-ink mb-1">Ce que disent nos clients</h2>
        <p className="text-sm text-muted mb-10">La satisfaction de nos clients est notre priorité.</p>

        <div className="relative px-8">
          <div className="bg-paper rounded-2xl p-8 shadow-sm text-left">
            <div className="flex gap-0.5 mb-4">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-yellow-400 text-lg">★</span>
              ))}
            </div>
            <p className="text-ink text-base italic leading-relaxed mb-6">
              « {t.text} »
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                {t.name[0]}
              </div>
              <div>
                <p className="font-semibold text-ink text-sm">{t.name}</p>
                <p className="text-xs text-muted">⭐ {t.source}</p>
              </div>
            </div>
          </div>

          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 bg-paper rounded-full shadow flex items-center justify-center text-ink hover:bg-paper-2 transition-colors text-lg font-light"
            aria-label="Précédent"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 bg-paper rounded-full shadow flex items-center justify-center text-ink hover:bg-paper-2 transition-colors text-lg font-light"
            aria-label="Suivant"
          >
            ›
          </button>
        </div>

        <div className="flex justify-center gap-2 mt-6">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? 'bg-primary w-6' : 'bg-primary/20 w-2'
              }`}
              aria-label={`Avis ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
