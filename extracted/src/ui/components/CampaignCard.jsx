import { dispatch } from '../../state/store.js';
import { liveCampaign, campaignable, CAMPAIGN_MONTHS, campaignKind, canCampaign, ownCampaignCost,
  startCampaign, CAMPAIGN_ENERGY } from '../../systems/career/awards.js';
import { theme } from '../theme.js';
import { Card } from './Card.jsx';


// The season for a picture, which is the thing Maxi paid six million for and never
// understood. It is not bought on an offer any more and it is not bought with money: a
// distributor funds its own campaign, and what it wants from you is three months of your
// calendar. The exception is a small picture nobody is spending on, where the money is
// genuinely yours. career/awards.js
export function CampaignCard({ g }) {
  const live = liveCampaign(g);
  const open = campaignable(g);
  if (!live && !open.length) return null;
  return (<Card style={{ marginBottom: 14, borderColor: 'rgba(158,116,255,.32)' }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.accent, marginBottom: 4 }}>For your consideration</div>
    {live
      ? (<div>
          <div style={{ fontSize: 12.5, fontWeight: 800 }}>"{String(live.title).replace('⭐ ', '')}"</div>
          <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45, marginTop: 2 }}>{live.line}</div>
          <div style={{ fontSize: 11.5, color: theme.accent, marginTop: 4, fontWeight: 700 }}>
            {live.months} of {CAMPAIGN_MONTHS} months done · {live.cost} energy a month, taken automatically
          </div>
          {live.missed > 0 && <div style={{ fontSize: 10.5, color: theme.bad, marginTop: 3 }}>You did not turn up last month. Miss it again and it is a poster.</div>}
        </div>)
      : open.map((c, i) => {
          const kind = campaignKind(c);
          const fit = canCampaign(g, c);
          return (<div key={c.id || i} style={{ padding: '6px 0', borderTop: i ? `1px solid ${theme.line}` : 'none' }}>
            <div style={{ fontSize: 12.5, fontWeight: 800 }}>"{String(c.title).replace('⭐ ', '')}" · {c.score}/10</div>
            <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45, marginTop: 2 }}>
              {kind === 'studio'
                ? `The studio wants to put it up for the season. They pay for all of it; what they want is ${CAMPAIGN_MONTHS} months of lunches, panels and the same four questions.`
                : `Nobody is spending anything on this one. You could: €${ownCampaignCost(g).toLocaleString()} of your own, and it does rather less than a studio would.`}
            </div>
            <button onClick={() => dispatch(startCampaign, c.title)} disabled={!fit.ok}
              style={{ marginTop: 5, border: 'none', borderRadius: 9, padding: '6px 11px', fontSize: 11.5, fontWeight: 800,
                cursor: fit.ok ? 'pointer' : 'default', background: fit.ok ? 'rgba(158,116,255,.18)' : 'rgba(120,110,150,.15)', color: fit.ok ? '#d9cffa' : '#6b6390' }}>
              {kind === 'studio' ? `Do the season · ${CAMPAIGN_ENERGY} energy a month` : `Fund it yourself · €${ownCampaignCost(g).toLocaleString()}`}
            </button>
            {!fit.ok && fit.why && <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 3 }}>{fit.why}</div>}
          </div>);
        })}
    <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 6, lineHeight: 1.45 }}>
      A season does not buy the award. It buys the nomination, which is the part that is for sale.
    </div>
  </Card>);
}
