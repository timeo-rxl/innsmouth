import { useState } from 'react'
import { gameStore, useGameStore, type DifficultyMode, type GraphicsQuality, type KeyboardLayout } from '../state/gameStore'
import { soundEngine } from '../audio/soundEngine'
import { MiniCthulhu } from './MiniCthulhu'

export function Screens() {
  const snap = useGameStore()
  const [tab, setTab] = useState<'play' | 'config'>('play')
  const [hoverPlay, setHoverPlay] = useState(false)

  if (snap.phase === 'playing') return null

  const { settings } = snap
  const moveKeysLabel = settings.keyboardLayout === 'qwerty' ? 'W A S D' : 'Z Q S D'

  const requestCanvasLock = () => {
    const canvas = document.querySelector('canvas')
    if (canvas && canvas.requestPointerLock) {
      try {
        const res = canvas.requestPointerLock() as unknown as Promise<void> | undefined
        if (res && typeof res.catch === 'function') res.catch(() => {})
      } catch {
        // Ignore restricted pointer lock environments
      }
    }
  }

  const handleStart = () => {
    soundEngine.initAndResume()
    gameStore.startGame()
    requestCanvasLock()
  }

  const handleRestart = () => {
    soundEngine.initAndResume()
    gameStore.restartGame()
    requestCanvasLock()
  }

  const handleToggleAudio = () => {
    soundEngine.initAndResume()
    const muted = soundEngine.toggleMute()
    gameStore.setMuted(muted)
  }

  const difficultyLabel: Record<DifficultyMode, string> = {
    exploration: 'Exploration',
    cauchemar: 'Cauchemar',
    folie: 'Folie pure',
  }

  return (
    <div style={styles.backdrop}>
      {/* Animated atmospheric menu fog & rotating Cthulhu sigil rings */}
      <div className="menu-fog-layer" style={styles.fogGlow} />
      <svg className="menu-sigil-cw" style={styles.sigilOuter} viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="186" stroke="rgba(85, 235, 175, 0.14)" strokeWidth="1.5" strokeDasharray="8 10" />
        <circle cx="200" cy="200" r="158" stroke="rgba(85, 235, 175, 0.11)" strokeWidth="1" />
        <polygon
          points="200,20 356,290 44,290"
          stroke="rgba(85, 235, 175, 0.1)"
          strokeWidth="1.2"
          fill="none"
        />
      </svg>
      <svg className="menu-sigil-ccw" style={styles.sigilInner} viewBox="0 0 320 320" fill="none">
        <circle cx="160" cy="160" r="142" stroke="rgba(120, 255, 200, 0.12)" strokeWidth="1.2" strokeDasharray="3 9" />
        <polygon
          points="160,300 32,76 288,76"
          stroke="rgba(120, 255, 200, 0.09)"
          strokeWidth="1"
          fill="none"
        />
      </svg>

      <div style={styles.card}>
        {snap.phase === 'menu' && (
          <>
            <div style={styles.eyebrow}>PORT MAUDIT · NOUVELLE-ANGLETERRE</div>
            <h1 className="menu-title-glow" style={styles.title}>
              INNSMOUTH
            </h1>
            <div style={styles.subtitle}>L&apos;Appel de Cthulhu</div>

            {/* Menu navigation tabs */}
            <div style={styles.tabBar}>
              <button
                id="tab-play"
                type="button"
                onClick={() => setTab('play')}
                style={{
                  ...styles.tabBtn,
                  ...(tab === 'play' ? styles.tabBtnActive : {}),
                }}
              >
                Rituel
              </button>
              <button
                id="tab-config"
                type="button"
                onClick={() => setTab('config')}
                style={{
                  ...styles.tabBtn,
                  ...(tab === 'config' ? styles.tabBtnActive : {}),
                }}
              >
                ⚙ Configuration
              </button>
            </div>

            {tab === 'play' ? (
              <>
                <p style={styles.story}>
                  Vous vous réveillez seul dans un port de pêche englouti par la brume ; retrouvez les cinq reliques du
                  culte et brisez le rituel au phare avant que la folie ou la Chose ne vous dévore.
                </p>

                {/* Quick inline configuration pills right on the main menu */}
                <div style={styles.quickBar}>
                  <div style={styles.quickGroup}>
                    <span style={styles.quickLabel}>Clavier</span>
                    <div style={styles.pillRow}>
                      {(['azerty', 'qwerty'] as KeyboardLayout[]).map((layout) => (
                        <button
                          key={layout}
                          id={`quick-kb-${layout}`}
                          type="button"
                          onClick={() => gameStore.updateSettings({ keyboardLayout: layout })}
                          style={{
                            ...styles.pillBtn,
                            ...(settings.keyboardLayout === layout ? styles.pillBtnActive : {}),
                          }}
                        >
                          {layout.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={styles.quickGroup}>
                    <span style={styles.quickLabel}>Interface (ATH)</span>
                    <div style={styles.pillRow}>
                      <button
                        id="quick-hud-on"
                        type="button"
                        onClick={() => gameStore.updateSettings({ hideHud: false })}
                        style={{
                          ...styles.pillBtn,
                          ...(!settings.hideHud ? styles.pillBtnActive : {}),
                        }}
                      >
                        Complet
                      </button>
                      <button
                        id="quick-hud-off"
                        type="button"
                        onClick={() => gameStore.updateSettings({ hideHud: true })}
                        style={{
                          ...styles.pillBtn,
                          ...(settings.hideHud ? styles.pillBtnActive : {}),
                        }}
                      >
                        Sans ATH
                      </button>
                    </div>
                  </div>
                </div>

                <div style={styles.controlsGrid}>
                  <div>
                    <strong>{moveKeysLabel}</strong> — Marcher ({settings.keyboardLayout.toUpperCase()})
                  </div>
                  <div>
                    <strong>Souris</strong> — Regarder
                  </div>
                  <div>
                    <strong>Maj</strong> — Courir
                  </div>
                  <div>
                    <strong>E</strong> — Interagir / Ramasser
                  </div>
                  <div>
                    <strong>F</strong> — Lampe torche
                  </div>
                  <div>
                    <strong>H</strong> — Basculer l&apos;ATH
                  </div>
                </div>

                <div style={styles.activeSummary}>
                  {difficultyLabel[settings.difficulty]} · Sensibilité {settings.mouseSensitivity}x ·{' '}
                  {settings.graphicsQuality === 'high' ? 'Qualité Élevée' : 'Mode Fluide'} ·{' '}
                  {snap.muted ? 'Audio Muet' : 'Audio Actif'}
                </div>

                <button
                  id="start-btn"
                  type="button"
                  onClick={handleStart}
                  onMouseEnter={() => setHoverPlay(true)}
                  onMouseLeave={() => setHoverPlay(false)}
                  style={{
                    ...styles.primaryBtn,
                    transform: hoverPlay ? 'translateY(-1px) scale(1.02)' : 'none',
                    boxShadow: hoverPlay
                      ? '0 0 28px rgba(72, 255, 186, 0.45)'
                      : '0 8px 22px rgba(0, 0, 0, 0.45)',
                  }}
                >
                  Cliquer pour jouer
                </button>
              </>
            ) : (
              <div style={styles.configList}>
                {/* Keyboard Layout */}
                <div style={styles.configRow}>
                  <div style={styles.configInfo}>
                    <div style={styles.configName}>Disposition clavier</div>
                    <div style={styles.configDesc}>Adapte les touches de déplacement et le HUD</div>
                  </div>
                  <div style={styles.pillRow}>
                    {(['azerty', 'qwerty'] as KeyboardLayout[]).map((layout) => (
                      <button
                        key={layout}
                        id={`cfg-kb-${layout}`}
                        type="button"
                        onClick={() => gameStore.updateSettings({ keyboardLayout: layout })}
                        style={{
                          ...styles.pillBtn,
                          ...(settings.keyboardLayout === layout ? styles.pillBtnActive : {}),
                        }}
                      >
                        {layout === 'azerty' ? 'AZERTY (ZQSD)' : 'QWERTY (WASD)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hide HUD / Immersion mode */}
                <div style={styles.configRow}>
                  <div style={styles.configInfo}>
                    <div style={styles.configName}>Mode Sans ATH (Immersion)</div>
                    <div style={styles.configDesc}>Masque toutes les interfaces en jeu (touche H)</div>
                  </div>
                  <div style={styles.pillRow}>
                    <button
                      id="cfg-hud-on"
                      type="button"
                      onClick={() => gameStore.updateSettings({ hideHud: false })}
                      style={{
                        ...styles.pillBtn,
                        ...(!settings.hideHud ? styles.pillBtnActive : {}),
                      }}
                    >
                      ATH Actif
                    </button>
                    <button
                      id="cfg-hud-off"
                      type="button"
                      onClick={() => gameStore.updateSettings({ hideHud: true })}
                      style={{
                        ...styles.pillBtn,
                        ...(settings.hideHud ? styles.pillBtnActive : {}),
                      }}
                    >
                      Sans ATH
                    </button>
                  </div>
                </div>

                {/* Difficulty */}
                <div style={styles.configRow}>
                  <div style={styles.configInfo}>
                    <div style={styles.configName}>Intensité de l&apos;horreur</div>
                    <div style={styles.configDesc}>Vitesse de la créature et perte de santé mentale</div>
                  </div>
                  <div style={styles.pillRow}>
                    {(['exploration', 'cauchemar', 'folie'] as DifficultyMode[]).map((diff) => (
                      <button
                        key={diff}
                        id={`cfg-diff-${diff}`}
                        type="button"
                        onClick={() => gameStore.updateSettings({ difficulty: diff })}
                        style={{
                          ...styles.pillBtn,
                          ...(settings.difficulty === diff ? styles.pillBtnActive : {}),
                        }}
                      >
                        {difficultyLabel[diff]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mouse Sensitivity */}
                <div style={styles.configRow}>
                  <div style={styles.configInfo}>
                    <div style={styles.configName}>Sensibilité souris</div>
                    <div style={styles.configDesc}>Vitesse de rotation de la caméra</div>
                  </div>
                  <div style={styles.pillRow}>
                    {[
                      { label: 'Lente', val: 0.6 },
                      { label: 'Normale', val: 1.0 },
                      { label: 'Rapide', val: 1.5 },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => gameStore.updateSettings({ mouseSensitivity: opt.val })}
                        style={{
                          ...styles.pillBtn,
                          ...(Math.abs(settings.mouseSensitivity - opt.val) < 0.05 ? styles.pillBtnActive : {}),
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Invert Y + Graphics + Audio */}
                <div style={styles.configRow}>
                  <div style={styles.configInfo}>
                    <div style={styles.configName}>Rendu &amp; Confort</div>
                    <div style={styles.configDesc}>Reflets temps réel, axe Y et son Web Audio</div>
                  </div>
                  <div style={styles.pillRow}>
                    {(['high', 'eco'] as GraphicsQuality[]).map((q) => (
                      <button
                        key={q}
                        id={`cfg-gfx-${q}`}
                        type="button"
                        onClick={() => gameStore.updateSettings({ graphicsQuality: q })}
                        style={{
                          ...styles.pillBtn,
                          ...(settings.graphicsQuality === q ? styles.pillBtnActive : {}),
                        }}
                      >
                        {q === 'high' ? 'Élevée' : 'Fluide'}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => gameStore.updateSettings({ invertY: !settings.invertY })}
                      style={{
                        ...styles.pillBtn,
                        ...(settings.invertY ? styles.pillBtnActive : {}),
                      }}
                    >
                      Axe Y {settings.invertY ? 'Inversé' : 'Normal'}
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleAudio}
                      style={{
                        ...styles.pillBtn,
                        ...(!snap.muted ? styles.pillBtnActive : {}),
                      }}
                    >
                      {snap.muted ? 'Son Muet' : 'Son Actif'}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  <button type="button" onClick={() => setTab('play')} style={styles.secondaryBtn}>
                    Retour
                  </button>
                  <button id="start-btn" type="button" onClick={handleStart} style={styles.primaryBtn}>
                    Jouer maintenant
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {snap.phase === 'paused' && (
          <>
            <div style={styles.eyebrow}>PAUSE · TEMPS FIGÉ</div>
            <h1 className="menu-title-glow" style={styles.title}>
              En suspens
            </h1>
            <p style={styles.story}>
              La brume s&apos;immobilise autour de vous. Ajustez vos réglages ou reprenez la quête des reliques (
              {snap.relicsCollected}/5).
            </p>
            <div style={styles.quickBar}>
              <div style={styles.quickGroup}>
                <span style={styles.quickLabel}>Clavier</span>
                <div style={styles.pillRow}>
                  {(['azerty', 'qwerty'] as KeyboardLayout[]).map((layout) => (
                    <button
                      key={layout}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiTick()
                        gameStore.updateSettings({ keyboardLayout: layout })
                      }}
                      style={{
                        ...styles.pillBtn,
                        ...(settings.keyboardLayout === layout ? styles.pillBtnActive : {}),
                      }}
                    >
                      {layout.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div style={styles.quickGroup}>
                <span style={styles.quickLabel}>Rendu</span>
                <div style={styles.pillRow}>
                  {(['high', 'eco'] as GraphicsQuality[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiTick()
                        gameStore.updateSettings({ graphicsQuality: q })
                      }}
                      style={{
                        ...styles.pillBtn,
                        ...(settings.graphicsQuality === q ? styles.pillBtnActive : {}),
                      }}
                    >
                      {q === 'high' ? 'Élevée' : 'Fluide'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={styles.statsRow}>
              <span>Santé mentale : {snap.sanity}/100</span>
              <span>Reliques : {snap.relicsCollected}/5</span>
              <span>Durée : {snap.elapsedSeconds}s</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                id="resume-btn"
                type="button"
                onClick={() => {
                  soundEngine.playUiTick()
                  gameStore.resumeGame()
                  requestCanvasLock()
                }}
                style={styles.primaryBtn}
              >
                Reprendre (P)
              </button>
              <button type="button" onClick={handleRestart} style={styles.secondaryBtn}>
                Recommencer
              </button>
              <button type="button" onClick={() => gameStore.returnToMenu()} style={styles.secondaryBtn}>
                Menu &amp; Options
              </button>
            </div>
          </>
        )}

        {snap.phase === 'lost' && (
          <>
            <div style={{ ...styles.eyebrow, color: '#f87171' }}>SANTÉ MENTALE : 0 · {difficultyLabel[settings.difficulty].toUpperCase()}</div>
            <h1 style={{ ...styles.title, color: '#fca5a5', textShadow: '0 0 28px rgba(239, 68, 68, 0.55)' }}>
              Tu as sombré
            </h1>
            <p style={styles.story}>{snap.lossReason}</p>
            <div style={styles.statsRow}>
              <span>Reliques retrouvées : {snap.relicsCollected}/5</span>
              <span>Durée : {snap.elapsedSeconds}s</span>
              <span>Mode : {difficultyLabel[settings.difficulty]}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button id="replay-btn" type="button" onClick={handleRestart} style={styles.dangerBtn}>
                Rejouer (R)
              </button>
              <button type="button" onClick={() => gameStore.returnToMenu()} style={styles.secondaryBtn}>
                Menu &amp; Options
              </button>
            </div>
          </>
        )}

        {snap.phase === 'won' && (
          <>
            <div style={{ ...styles.eyebrow, color: '#6effcb' }}>RITUEL BRISÉ · {difficultyLabel[settings.difficulty].toUpperCase()}</div>
            <h1 className="menu-title-glow" style={{ ...styles.title, color: '#9effdb' }}>
              L&apos;Aube sur Innsmouth
            </h1>
            <p style={styles.story}>
              Les cinq reliques résonnent au sommet du phare ; le faisceau fend la brume verte et la Chose s&apos;abîme
              dans les flots noirs.
            </p>
            <div style={styles.statsRow}>
              <span>Reliques : 5/5</span>
              <span>Santé mentale restante : {snap.sanity}/100</span>
              <span>Temps : {snap.elapsedSeconds}s</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button id="replay-btn" type="button" onClick={handleRestart} style={styles.primaryBtn}>
                Rejouer (R)
              </button>
              <button type="button" onClick={() => gameStore.returnToMenu()} style={styles.secondaryBtn}>
                Menu &amp; Options
              </button>
            </div>
          </>
        )}
      </div>

      {/* Animated wandering mini-Cthulhu on the menu */}
      {snap.phase === 'menu' && <MiniCthulhu excited={hoverPlay || tab === 'config'} />}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 30,
    background: 'radial-gradient(circle at center, rgba(6, 24, 21, 0.68), rgba(2, 6, 7, 0.92))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 20px 84px',
    overflowY: 'auto',
  },
  fogGlow: {
    position: 'fixed',
    inset: '-10%',
    background:
      'radial-gradient(circle at 30% 40%, rgba(56, 200, 145, 0.12), transparent 52%), radial-gradient(circle at 75% 65%, rgba(30, 120, 105, 0.14), transparent 50%)',
    pointerEvents: 'none',
  },
  sigilOuter: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: '680px',
    height: '680px',
    pointerEvents: 'none',
  },
  sigilInner: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: '540px',
    height: '540px',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 32,
    maxWidth: '610px',
    width: '100%',
    background: 'rgba(6, 15, 16, 0.88)',
    border: '1px solid rgba(105, 235, 185, 0.34)',
    borderRadius: '16px',
    padding: '24px 26px',
    textAlign: 'center',
    boxShadow: '0 24px 70px rgba(0, 0, 0, 0.8), inset 0 0 36px rgba(45, 160, 120, 0.08)',
    backdropFilter: 'blur(12px)',
  },
  eyebrow: {
    fontSize: '11px',
    letterSpacing: '0.24em',
    color: '#6ddcb4',
    marginBottom: '6px',
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontSize: '40px',
    letterSpacing: '0.14em',
    color: '#e7f8f0',
    fontWeight: 700,
  },
  subtitle: {
    fontSize: '17px',
    color: '#88ccb2',
    marginTop: '2px',
    marginBottom: '14px',
    fontStyle: 'italic',
  },
  tabBar: {
    display: 'inline-flex',
    gap: '6px',
    padding: '4px',
    borderRadius: '999px',
    background: 'rgba(0, 0, 0, 0.34)',
    border: '1px solid rgba(110, 210, 175, 0.2)',
    marginBottom: '16px',
  },
  tabBtn: {
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    color: '#8db2a5',
    padding: '6px 16px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 700,
    transition: 'all 160ms ease',
  },
  tabBtnActive: {
    background: 'rgba(46, 158, 120, 0.35)',
    color: '#d8fff0',
    boxShadow: '0 0 12px rgba(72, 255, 186, 0.2)',
  },
  story: {
    fontSize: '14.5px',
    lineHeight: 1.55,
    color: '#c4dad2',
    margin: '0 auto 16px',
  },
  quickBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    background: 'rgba(10, 24, 24, 0.72)',
    border: '1px solid rgba(105, 225, 180, 0.22)',
    borderRadius: '10px',
    padding: '10px 14px',
    marginBottom: '14px',
  },
  quickGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  quickLabel: {
    fontSize: '12px',
    color: '#95b9ac',
    fontWeight: 700,
  },
  pillRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  pillBtn: {
    cursor: 'pointer',
    background: 'rgba(255, 255, 255, 0.05)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(120, 210, 175, 0.22)',
    color: '#a3c2b7',
    fontSize: '11.5px',
    fontWeight: 700,
    padding: '5px 10px',
    borderRadius: '6px',
    transition: 'all 140ms ease',
  },
  pillBtnActive: {
    background: 'rgba(42, 165, 122, 0.38)',
    borderColor: '#6effcb',
    color: '#ecfff7',
    boxShadow: '0 0 10px rgba(72, 255, 186, 0.24)',
  },
  controlsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '7px 14px',
    textAlign: 'left',
    fontSize: '12.5px',
    color: '#b7d0c7',
    background: 'rgba(0, 0, 0, 0.28)',
    border: '1px solid rgba(110, 210, 175, 0.16)',
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '12px',
  },
  activeSummary: {
    fontSize: '11.5px',
    color: '#7da899',
    marginBottom: '16px',
  },
  configList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    textAlign: 'left',
  },
  configRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '9px 12px',
    background: 'rgba(0, 0, 0, 0.26)',
    border: '1px solid rgba(110, 210, 175, 0.15)',
    borderRadius: '8px',
  },
  configInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  configName: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#daf2e8',
  },
  configDesc: {
    fontSize: '11px',
    color: '#88a89d',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '18px',
    flexWrap: 'wrap',
    fontSize: '13px',
    color: '#9fc5b8',
    marginBottom: '22px',
  },
  primaryBtn: {
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #1b6b54, #289674)',
    border: '1px solid #75ffca',
    color: '#ecfff7',
    fontSize: '15.5px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    padding: '12px 28px',
    borderRadius: '8px',
    transition: 'all 160ms ease',
  },
  secondaryBtn: {
    cursor: 'pointer',
    background: 'rgba(20, 42, 38, 0.75)',
    border: '1px solid rgba(125, 220, 185, 0.35)',
    color: '#c9e8dc',
    fontSize: '14px',
    fontWeight: 700,
    padding: '11px 20px',
    borderRadius: '8px',
  },
  dangerBtn: {
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #6d1924, #9b2434)',
    border: '1px solid #ff949e',
    color: '#fff1f2',
    fontSize: '15.5px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    padding: '12px 28px',
    borderRadius: '8px',
  },
}
