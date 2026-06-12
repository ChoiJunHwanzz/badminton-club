// 대진표를 화면 디자인 그대로 엑셀(.xls)로 내려받기 (라이브러리 없이 HTML→xls)
import { TournamentGame, Teams, DEFAULT_COURT_COUNT, DEFAULT_TITLE } from './tournamentData'

const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const td = (txt: string, style: string) =>
  `<td style="border:1px solid #B0B0B0;padding:5px 9px;${style}">${esc(txt)}</td>`

export function exportBracketXls(
  games: TournamentGame[],
  teams: Teams | null | undefined,
  title: string = DEFAULT_TITLE,
  courtCount: number = DEFAULT_COURT_COUNT
) {
  if (typeof document === 'undefined') return
  const t1 = teams?.team1?.name || '청팀'
  const t2 = teams?.team2?.name || '백팀'
  const perRound = courtCount * 2 // 8

  const headCell = (txt: string) =>
    td(txt, 'background:#1F3864;color:#FFFFFF;font-weight:bold;text-align:center')

  let rows = `<tr>${headCell('경기')}${headCell(t1)}${headCell('VS')}${headCell(t2)}${headCell('심판')}</tr>`

  games.forEach((g, i) => {
    if (i % perRound === 0) {
      const round = Math.floor(i / perRound) + 1
      rows += `<tr><td colspan="5" style="border:1px solid #B0B0B0;background:#BDD7EE;color:#1F3864;font-weight:bold;padding:5px 9px">■ 라운드 ${round}</td></tr>`
    }
    rows +=
      `<tr>` +
      td(`${i + 1}경기`, 'background:#F2F2F2;font-weight:bold;text-align:center') +
      td(`${g.team1[0]} + ${g.team1[1]}`, 'background:#DDEBF7;color:#1F4E79;font-weight:bold;text-align:center') +
      td('vs', 'background:#E7E6F7;color:#7030A0;text-align:center;font-size:10px') +
      td(`${g.team2[0]} + ${g.team2[1]}`, 'background:#FCE4E4;color:#9C0006;font-weight:bold;text-align:center') +
      td(g.referee || '', 'text-align:center') +
      `</tr>`
  })

  const html =
    `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8">` +
    `<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>` +
    `<x:Name>대진표</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>` +
    `</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->` +
    `</head><body>` +
    `<table border="1" style="border-collapse:collapse;font-family:'맑은 고딕','Malgun Gothic',sans-serif;font-size:13px">${rows}</table>` +
    `</body></html>`

  const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `대진표_${title}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 대진표를 디자인된 PDF로 (인쇄 → PDF로 저장)
export function exportBracketPdf(
  games: TournamentGame[],
  teams: Teams | null | undefined,
  title: string = DEFAULT_TITLE,
  courtCount: number = DEFAULT_COURT_COUNT
) {
  if (typeof window === 'undefined') return
  const t1 = teams?.team1?.name || '청팀'
  const t2 = teams?.team2?.name || '백팀'
  const perRound = courtCount * 2

  let rows = ''
  games.forEach((g, i) => {
    if (i % perRound === 0) {
      const round = Math.floor(i / perRound) + 1
      rows += `<tr class="round"><td colspan="5">■ 라운드 ${round}</td></tr>`
    }
    rows +=
      `<tr>` +
      `<td class="no">${i + 1}경기</td>` +
      `<td class="t1">${esc(g.team1[0])} + ${esc(g.team1[1])}</td>` +
      `<td class="vs">vs</td>` +
      `<td class="t2">${esc(g.team2[0])} + ${esc(g.team2[1])}</td>` +
      `<td class="ref">${esc(g.referee || '')}</td>` +
      `</tr>`
  })

  const html =
    `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${esc(title)} 대진표</title>` +
    `<style>` +
    `@page{size:A4;margin:14mm}` +
    `*{box-sizing:border-box}` +
    `body{font-family:'Malgun Gothic','맑은 고딕',sans-serif;color:#1f2937;margin:0}` +
    `h1{text-align:center;font-size:22px;margin:0 0 4px}` +
    `.sub{text-align:center;color:#6b7280;font-size:12px;margin-bottom:14px}` +
    `table{width:100%;border-collapse:collapse}` +
    `th,td{border:1px solid #cbd5e1;padding:6px 8px;font-size:12.5px;text-align:center}` +
    `thead th{background:#1F3864;color:#fff}` +
    `tr{page-break-inside:avoid}` +
    `.round td{background:#BDD7EE;color:#1F3864;font-weight:bold;text-align:left}` +
    `.no{background:#F3F4F6;font-weight:bold}` +
    `.t1{background:#DDEBF7;color:#1F4E79;font-weight:bold}` +
    `.vs{color:#7c3aed;font-size:10px}` +
    `.t2{background:#FCE4E4;color:#9C0006;font-weight:bold}` +
    `.ref{color:#374151}` +
    `</style></head><body>` +
    `<h1>🏸 ${esc(title)}</h1><div class="sub">대진표 · 총 ${games.length}경기</div>` +
    `<table><thead><tr><th>경기</th><th>${esc(t1)}</th><th>VS</th><th>${esc(t2)}</th><th>심판</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>` +
    `</body></html>`

  const w = window.open('', '_blank')
  if (!w) {
    alert('팝업이 차단됐어요. 팝업 허용 후 다시 시도해 주세요.')
    return
  }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => {
    w.print()
  }, 350)
}
