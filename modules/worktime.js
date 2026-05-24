// modules/worktime.js
var _wtSegments = [];
var _wtSettings = {};
var _wtFinalized = false;

var WT_DEFAULT_SETTINGS = {
  pilotExtra: 0, cabinExtra: 0, landings: '1-2', extension: 0, restType: 'base', reportTime: '09:00', postflight: 30
};

function wtParseTime(str) {
  if (!str) return null;
  var parts = str.split(':');
  if (parts.length !== 2) return null;
  var h = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}
function wtFormatTime(minutes) {
  var norm = ((minutes % 1440) + 1440) % 1440;
  var h = Math.floor(norm / 60);
  var m = norm % 60;
  return (h < 10 ? '0' + h : '' + h) + ':' + (m < 10 ? '0' + m : '' + m);
}
function wtFmtMin(totalMinutes) {
  var h = Math.floor(totalMinutes / 60);
  var m = totalMinutes % 60;
  var mm = m < 10 ? '0' + m : '' + m;
  return h + ' ч ' + mm + ' мин';
}
function wtDiffTime(startMin, endMin) {
  if (endMin < startMin) endMin += 1440;
  return endMin - startMin;
}
function wtIsNight(reportMinutes) {
  return reportMinutes >= 1140 || reportMinutes <= 179;
}
function wtGetMaxDuty(extra, landings, night) {
  var base;
  if (extra === 0) {
    if (landings === '1-2') { base = night ? 11 * 60 : 12 * 60; }
    else { base = night ? 10 * 60 : 10 * 60 + 30; }
  } else if (extra === 1) { base = (landings === '1-2') ? 13 * 60 : 12 * 60; }
  else { base = (landings === '1-2') ? 16 * 60 : 14 * 60; }
  return base;
}
function wtCalcRest(workedMinutes, restType) {
  var h = workedMinutes / 60;
  if (restType === 'base') {
    if (h <= 12) return 12;
    if (h <= 14) return 14;
    return 18;
  } else {
    if (h <= 12) return 10;
    if (h <= 14) return 12;
    return 16;
  }
}
function wtCalcResults(segments, settings) {
  var report = wtParseTime(settings.reportTime);
  if (report === null || segments.length === 0) return null;
  var night = wtIsNight(report);
  var pilotMax = wtGetMaxDuty(settings.pilotExtra, settings.landings, night) + settings.extension * 60;
  var cabinMax = wtGetMaxDuty(settings.cabinExtra, settings.landings, night) + settings.extension * 60;
  var lastStop = segments[segments.length - 1].engineStop;
  var dutyToStop = wtDiffTime(report, lastStop);
  var duty = dutyToStop + (settings.postflight || 0);
  var shiftEnd = (report + duty) % 1440;
  var restHours = wtCalcRest(duty, settings.restType);
  var restEnd = (report + duty + restHours * 60) % 1440;
  var totalFlight = 0, totalAir = 0;
  for (var i = 0; i < segments.length; i++) {
    totalFlight += segments[i].flightTime;
    totalAir += segments[i].airTime;
  }
  var warnings = [];
  var firstStart = segments[0].engineStart;
  if (wtDiffTime(report, firstStart) < 60) warnings.push('Менее 1 ч от явки до запуска двигателей');
  if (duty > pilotMax) warnings.push('ЛЭ: превышение макс. рабочего времени (' + wtFmtMin(duty) + ' > ' + wtFmtMin(pilotMax) + ')');
  if (duty > cabinMax) warnings.push('КЭ: превышение макс. рабочего времени (' + wtFmtMin(duty) + ' > ' + wtFmtMin(cabinMax) + ')');
  if ((settings.postflight || 0) > 60) warnings.push('Послеполётные работы > 60 мин — проверьте нормативы');
  return { night: night, pilotMax: pilotMax, cabinMax: cabinMax, duty: duty, shiftEnd: shiftEnd, restHours: restHours, restEnd: restEnd, totalFlight: totalFlight, totalAir: totalAir, warnings: warnings };
}

function wtLoadSettings() {
  try { var raw = localStorage.getItem('wt_settings_v2'); var saved = raw ? JSON.parse(raw) : {}; var result = {}; for (var k in WT_DEFAULT_SETTINGS) { result[k] = (saved && saved[k] !== undefined) ? saved[k] : WT_DEFAULT_SETTINGS[k]; } return result; } catch(e) { var fallback = {}; for (var kk in WT_DEFAULT_SETTINGS) fallback[kk] = WT_DEFAULT_SETTINGS[kk]; return fallback; }
}
function wtSaveSettings(settings) { try { localStorage.setItem('wt_settings_v2', JSON.stringify(settings)); } catch(e) {} }
function wtLoadSegments() { try { var raw = localStorage.getItem('wt_segments_v2'); return raw ? JSON.parse(raw) : []; } catch(e) { return []; } }
function wtSaveSegments(segments) { try { localStorage.setItem('wt_segments_v2', JSON.stringify(segments)); } catch(e) {} }

function wtCheckOverlap(newStart, newStop, segments, excludeIdx) {
  var ns = newStart;
  var ne = newStop < newStart ? newStop + 1440 : newStop;
  for (var i = 0; i < segments.length; i++) {
    if (i === excludeIdx) continue;
    var es = segments[i].engineStart;
    var ee = segments[i].engineStop < segments[i].engineStart ? segments[i].engineStop + 1440 : segments[i].engineStop;
    if (ns < ee && ne > es) return true;
  }
  return false;
}
function wtVal(id) { var el = document.getElementById(id); return el ? el.value : ''; }

function wtRenderProgressBar(actual, max, label) {
  var pct = Math.min(Math.round((actual / max) * 100), 100);
  var exceeded = actual > max;
  var warning = !exceeded && pct > 85;
  var fillClass = exceeded ? 'ct-progress-bar-fill--danger' : (warning ? 'ct-progress-bar-fill--warning' : 'ct-progress-bar-fill--ok');
  var dotClass = exceeded ? 'ct-status-dot--danger' : 'ct-status-dot--ok';
  return '<div style="margin-top:10px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;"><span class="ct-heading-sm" style="font-size:var(--font-xs);text-transform:none;">' + label + '</span><span class="ct-status-dot ' + dotClass + '"></span></div><div class="ct-progress-bar"><div class="ct-progress-bar-fill ' + fillClass + '" style="width:' + pct + '%"></div></div><div class="ct-progress-label"><span>' + wtFmtMin(actual) + '</span><span>макс. ' + wtFmtMin(max) + '</span></div></div>';
}
function wtResultItem(icon, label, value) {
  return '<div class="ct-result-item"><div class="ct-result-item-label">' + icon + ' ' + label + '</div><div class="ct-result-item-value">' + value + '</div></div>';
}
function wtEmptyPlaneIconSVG() {
  return '<svg class="ct-empty-icon" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="50" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/><path d="M85 55L65 60L58 85L52 72L38 78L44 64L30 58L56 52L62 27L68 40L82 34L76 48L85 55Z" fill="currentColor" opacity="0.35"/><path d="M65 60L58 85L52 72L38 78L44 64L30 58" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/></svg>';
}

function wtRenderTimeline(segments) {
  var totalMin = 1440;
  var hourLabels = [0,3,6,9,12,15,18,21];
  var html = '<div class="ct-timeline-container"><div class="ct-timeline-header">';
  for (var i=0;i<hourLabels.length;i++) html += '<span>'+(hourLabels[i]<10?'0'+hourLabels[i]:hourLabels[i])+':00</span>';
  html += '</div><div class="ct-timeline-track">';
  var allHours=[0,3,6,9,12,15,18,21,24];
  for(var g=0;g<allHours.length;g++){ var leftPct=(allHours[g]*60/totalMin*100).toFixed(2); html+='<div class="ct-timeline-gridline" style="left:'+leftPct+'%;"></div>'; }
  for(var s=0;s<segments.length;s++){ var seg=segments[s]; var startPct=(seg.engineStart/totalMin*100).toFixed(3); var widthPct=Math.max((seg.engineStop-seg.engineStart)/totalMin*100,0.3).toFixed(3); var toPct=(seg.takeoff/totalMin*100).toFixed(3); var ldPct=(seg.landing/totalMin*100).toFixed(3); var colorIdx=s%5; html+='<div class="ct-timeline-segment ct-segment-color-'+colorIdx+'" style="left:'+startPct+'%;width:'+widthPct+'%;" title="Сег. '+(s+1)+': '+wtFormatTime(seg.engineStart)+'–'+wtFormatTime(seg.engineStop)+'"></div><div class="ct-timeline-marker ct-timeline-marker--takeoff" style="left:'+toPct+'%;" title="Взлёт: '+wtFormatTime(seg.takeoff)+'"></div><div class="ct-timeline-marker ct-timeline-marker--landing" style="left:'+ldPct+'%;" title="Посадка: '+wtFormatTime(seg.landing)+'"></div>'; }
  html+='</div><div style="display:flex;gap:16px;margin-top:8px;"><div style="display:flex;align-items:center;gap:4px;font-size:var(--font-xs);"><div style="width:8px;height:8px;border-radius:50%;background:var(--color-success);border:1.5px solid white;"></div> Взлёт</div><div style="display:flex;align-items:center;gap:4px;"><div style="width:8px;height:8px;border-radius:50%;background:var(--color-warning);border:1.5px solid white;"></div> Посадка</div></div></div>';
  return html;
}
function wtRenderSegmentCard(seg, idx){
  var colorIdx=idx%5;
  return '<div class="ct-segment-card"><div class="segment-info"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span class="ct-segment-color-'+colorIdx+'" style="width:12px;height:12px;border-radius:3px;display:inline-block;"></span><strong class="ct-heading-md">Сегмент '+(idx+1)+'</strong></div><div style="display:flex;gap:12px;flex-wrap:wrap;font-size:var(--font-sm);color:var(--color-text-secondary);"><span>Полётное: <strong class="ct-mono-time">'+wtFmtMin(seg.flightTime)+'</strong></span><span>Лётное: <strong class="ct-mono-time">'+wtFmtMin(seg.airTime)+'</strong></span></div><div style="font-size:var(--font-xs);color:var(--color-text-muted);margin-top:4px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;"><span class="ct-mono-time">'+wtFormatTime(seg.engineStart)+'</span><span>→</span>'+window.ICONS['plane-takeoff']+'<span class="ct-mono-time">'+wtFormatTime(seg.takeoff)+'</span><span>→</span>'+window.ICONS['plane-landing']+'<span class="ct-mono-time">'+wtFormatTime(seg.landing)+'</span><span>→</span><span class="ct-mono-time">'+wtFormatTime(seg.engineStop)+'</span></div></div><button class="delete-segment" data-idx="'+idx+'" aria-label="Удалить сегмент '+(idx+1)+'">'+window.ICONS.trash+'</button></div>';
}
function wtRenderResultsCard(results){
  var allOk=results.warnings.length===0;
  var html='<div class="app-card ct-card--results'+(allOk?' ct-card--all-ok':'')+'"><div class="app-card-header"><div style="display:flex;align-items:center;gap:10px;"><div class="ct-card-icon ct-card-icon--results">'+window.ICONS.gauge+'</div><h2 class="ct-heading-lg">Итоги рейса</h2></div><div style="display:flex;align-items:center;gap:8px;">'+(allOk?'<span class="ct-checkmark-circle">'+window.ICONS['check-circle']+'</span>':'')+'<button class="icon-btn" id="wtShareBtn" aria-label="Поделиться" style="color:var(--color-text-white);background:var(--color-primary-ghost);">'+window.ICONS.share+'</button></div></div><div class="ct-results-grid" style="margin-bottom:16px;border:1px solid var(--color-border-subtle);border-radius:var(--border-radius-md);overflow:hidden;">'+wtResultItem(window.ICONS.timer,'Фактическое рабочее время',wtFmtMin(results.duty))+wtResultItem(window.ICONS.plane,'Полётное время',wtFmtMin(results.totalFlight))+wtResultItem(window.ICONS['circle-dot'],'Лётное время',wtFmtMin(results.totalAir))+wtResultItem(window.ICONS.flag,'Окончание смены',wtFormatTime(results.shiftEnd))+wtResultItem(window.ICONS.moon,'Минимальный отдых',results.restHours+' ч')+wtResultItem(window.ICONS.clock,'Окончание отдыха',wtFormatTime(results.restEnd))+'</div>';
  if(!allOk){ html+='<div class="warning-block" style="display:flex;flex-direction:column;gap:6px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">'+window.ICONS['alert-triangle']+' <strong>Нарушения FTL</strong></div>'; for(var i=0;i<results.warnings.length;i++) html+='<div style="padding-left:26px;">'+results.warnings[i]+'</div>'; html+='</div>'; }
  else html+='<div class="ok-block" style="display:flex;align-items:center;gap:10px;">'+window.ICONS['check-circle']+' <span>Нарушений не обнаружено. Соответствие нормам FTL.</span></div>';
  html+='<div style="font-size:var(--font-xs);color:var(--color-text-muted);margin-top:12px;">*Расчёт от явки до выключения двигателей последнего сегмента + послеполётные работы.</div></div>';
  return html;
}
function wtRenderDutyCard(results, night, pilotMax, cabinMax, reportMin){
  var actualDuty = (results && _wtFinalized) ? results.duty : 0;
  var html='<div class="app-card ct-card--duty"><div class="app-card-header"><div style="display:flex;align-items:center;gap:10px;"><div class="ct-card-icon ct-card-icon--duty">'+window.ICONS.clock+'</div><h2 class="ct-heading-md">Нормы рабочего времени</h2></div>'+(night?'<span class="badge-danger" style="display:flex;align-items:center;gap:4px;">'+window.ICONS.moon+' Ночь</span>':'')+'</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:12px;"><div class="ct-sub-card"><div class="ct-sub-card-label">'+window.ICONS.plane+' Лётный экипаж (ЛЭ)</div><div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;"><div><span style="font-size:var(--font-xs);color:var(--color-text-muted);">Максимум</span><div class="ct-mono-time" style="font-weight:700;">'+wtFmtMin(pilotMax)+'</div></div><div style="text-align:right;"><span style="font-size:var(--font-xs);color:var(--color-text-muted);">Окончание</span><div class="ct-mono-time" style="font-weight:700;">'+(reportMin!==null?wtFormatTime(reportMin+pilotMax):'--:--')+'</div></div></div>'+(actualDuty>0?wtRenderProgressBar(actualDuty,pilotMax,'ЛЭ'):'')+'</div><div class="ct-sub-card"><div class="ct-sub-card-label">'+window.ICONS.users+' Кабинный экипаж (КЭ)</div><div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;"><div><span style="font-size:var(--font-xs);color:var(--color-text-muted);">Максимум</span><div class="ct-mono-time" style="font-weight:700;">'+wtFmtMin(cabinMax)+'</div></div><div style="text-align:right;"><span style="font-size:var(--font-xs);color:var(--color-text-muted);">Окончание</span><div class="ct-mono-time" style="font-weight:700;">'+(reportMin!==null?wtFormatTime(reportMin+cabinMax):'--:--')+'</div></div></div>'+(actualDuty>0?wtRenderProgressBar(actualDuty,cabinMax,'КЭ'):'')+'</div></div><div class="info-block" style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;padding:10px 16px;margin-bottom:0;"><div style="display:flex;align-items:center;gap:6px;">'+(night?window.ICONS.moon:window.ICONS.sun)+' <strong>Ночная смена:</strong><span class="'+(night?'badge-danger':'badge-ok')+'">'+(night?'Да (22:00–03:00)':'Нет')+'</span></div><div style="display:flex;align-items:center;gap:6px;">'+window.ICONS.clock+' <strong>Явка:</strong><span class="ct-mono-time">'+_wtSettings.reportTime+'</span></div>'+( _wtSettings.extension>0?'<div style="display:flex;align-items:center;gap:6px;">'+window.ICONS.timer+' <strong>Продление КВС:</strong> +'+_wtSettings.extension+' ч</div>':'')+'</div>'+( (!_wtFinalized && _wtSegments.length===0)?'<div style="font-size:var(--font-sm);color:var(--color-text-secondary);padding:8px 0;display:flex;align-items:center;gap:6px;">'+window.ICONS['chevron-right']+' Добавляйте сегменты через '+window.ICONS.settings+'. После добавления — нажмите «Завершить рейс».</div>':'')+'</div>';
  return html;
}
function wtRenderSegmentsCard(results){
  var html='<div class="app-card ct-card--segments"><div class="app-card-header"><div style="display:flex;align-items:center;gap:10px;"><div class="ct-card-icon ct-card-icon--segments">'+window.ICONS.plane+'</div><h2 class="ct-heading-md">Сегменты полёта</h2></div><div style="display:flex;gap:8px;"><button class="btn-danger-outline" id="wtResetBtn" style="font-size:var(--font-xs);padding:6px 12px;min-height:36px;">'+window.ICONS['rotate-ccw']+' Сбросить</button><button class="btn-primary" id="wtFinalizeBtn" style="font-size:var(--font-xs);padding:6px 12px;min-height:36px;">'+window.ICONS.flag+' Завершить рейс</button></div></div>';
  if(_wtSegments.length===0){
    html+='<div class="ct-empty-state">'+wtEmptyPlaneIconSVG()+'<div class="ct-empty-title">Нет сегментов</div><div class="ct-empty-text">Добавьте первый сегмент полёта — запуск двигателей, взлёт, посадка, выключение.</div><button class="btn-primary" id="wtAddFirstBtn" style="font-size:var(--font-sm);">'+window.ICONS.plus+' Добавить сегмент</button></div>';
  }else{
    html+=wtRenderTimeline(_wtSegments);
    for(var i=0;i<_wtSegments.length;i++) html+=wtRenderSegmentCard(_wtSegments[i],i);
    var totalFlight=0,totalAir=0; for(var j=0;j<_wtSegments.length;j++){ totalFlight+=_wtSegments[j].flightTime; totalAir+=_wtSegments[j].airTime; }
    html+='<div class="total-stats" style="display:flex;justify-content:center;gap:24px;"><span><strong>Итого:</strong></span><span>Полётное <strong class="ct-mono-time">'+wtFmtMin(totalFlight)+'</strong></span><span style="color:var(--color-border);">|</span><span>Лётное <strong class="ct-mono-time">'+wtFmtMin(totalAir)+'</strong></span></div>';
  }
  html+='</div>';
  return html;
}
function wtRenderAll(){
  var container=document.getElementById('worktimeContainer'); if(!container) return;
  var results=_wtFinalized?wtCalcResults(_wtSegments,_wtSettings):null;
  var night=wtIsNight(wtParseTime(_wtSettings.reportTime)||0);
  var pilotMax=wtGetMaxDuty(_wtSettings.pilotExtra,_wtSettings.landings,night)+_wtSettings.extension*60;
  var cabinMax=wtGetMaxDuty(_wtSettings.cabinExtra,_wtSettings.landings,night)+_wtSettings.extension*60;
  var reportMin=wtParseTime(_wtSettings.reportTime);
  var html='<div class="module-container" style="padding-top:16px;padding-bottom:32px;">'+wtRenderDutyCard(results,night,pilotMax,cabinMax,reportMin)+wtRenderSegmentsCard(results)+(_wtFinalized&&results?wtRenderResultsCard(results):'')+'</div>';
  container.innerHTML=html;
}
function wtOpenSettings(){
  var overlay=document.getElementById('wtSettingsOverlay'); var sheet=document.getElementById('wtSettingsSheet');
  var closeBtn=document.getElementById('wtCloseSettingsBtn'); if(closeBtn) closeBtn.innerHTML=window.ICONS.x||window.ICONS.close;
  wtRenderSettingsSummary(); wtRenderSettingsContent();
  if(overlay) overlay.classList.add('open'); if(sheet) sheet.classList.add('open');
}
function wtCloseSettings(){
  var overlay=document.getElementById('wtSettingsOverlay'); var sheet=document.getElementById('wtSettingsSheet');
  if(overlay) overlay.classList.remove('open'); if(sheet) sheet.classList.remove('open');
}
function wtRenderSettingsSummary(){
  var el=document.getElementById('wtSettingsSummary'); if(!el) return;
  el.innerHTML='<div class="ct-dialog-summary-item"><span class="ct-dialog-summary-label">Явка</span><span class="ct-dialog-summary-value">'+_wtSettings.reportTime+'</span></div><div class="ct-dialog-summary-item"><span class="ct-dialog-summary-label">Посадки</span><span class="ct-dialog-summary-value">'+_wtSettings.landings+'</span></div><div class="ct-dialog-summary-item"><span class="ct-dialog-summary-label">Отдых</span><span class="ct-dialog-summary-value">'+(_wtSettings.restType==='base'?'База':'Внебаз.')+'</span></div><div class="ct-dialog-summary-item"><span class="ct-dialog-summary-label">Сегм.</span><span class="ct-dialog-summary-value">'+_wtSegments.length+'</span></div>';
}
function wtSettingsGroup(icon,title,body){ return '<div class="ct-settings-group"><div class="ct-settings-group-title">'+icon+' '+title+'</div>'+body+'</div>'; }
function wtSelect(id,options,selected){ var html='<select id="'+id+'" class="wt-field-input">'; for(var i=0;i<options.length;i++){ var val=options[i][0]; var text=options[i][1]; html+='<option value="'+val+'"'+(val===selected?' selected':'')+'>'+text+'</option>'; } html+='</select>'; return html; }
function wtRenderSettingsContent(){
  var el=document.getElementById('wtSettingsContent'); if(!el) return;
  var s=_wtSettings;
  el.innerHTML='<div class="wt-settings-groups">'+
    wtSettingsGroup(window.ICONS.plane,'Лётный экипаж (ЛЭ)','<label class="wt-field-label">Доп. члены</label>'+wtSelect('wtPilotExtra',[['0','Нет'],['1','+1 член'],['2','+2 члена']],String(s.pilotExtra)))+
    wtSettingsGroup(window.ICONS.users,'Кабинный экипаж (КЭ)','<label class="wt-field-label">Доп. члены</label>'+wtSelect('wtCabinExtra',[['0','Нет'],['1','+1 член'],['2','+2 члена']],String(s.cabinExtra)))+
    wtSettingsGroup(window.ICONS['plane-landing'],'Посадки','<label class="wt-field-label">Количество</label>'+wtSelect('wtLandings',[['1-2','1–2 посадки'],['3-4','3–4 посадки']],s.landings))+
    wtSettingsGroup(window.ICONS.timer,'Продление КВС','<label class="wt-field-label">Продление</label>'+wtSelect('wtExtension',[['0','Без продления'],['2','+2 часа'],['3','+3 часа']],String(s.extension)))+
    wtSettingsGroup(window.ICONS.moon,'Отдых','<label class="wt-field-label">Тип отдыха</label>'+wtSelect('wtRestType',[['base','Базовый аэропорт'],['nonbase','Внебазовый']],s.restType))+
    wtSettingsGroup(window.ICONS.clock,'Начало смены','<label class="wt-field-label">Явка (HH:MM)</label><input id="wtReportTime" type="time" class="wt-field-input" value="'+s.reportTime+'">')+
    '</div><div style="border-top:1px solid var(--color-border-subtle);margin:16px 0;"></div>'+
    '<h3 class="ct-heading-md" style="margin-bottom:12px;display:flex;align-items:center;gap:8px;">'+window.ICONS.plus+' Добавить новый сегмент</h3>'+
    '<div class="wt-segment-inputs">'+
    '<div><label class="wt-field-label">Запуск двигателей</label><input id="wtEngineStart" type="time" class="wt-field-input" value="10:00"></div>'+
    '<div><label class="wt-field-label">Взлёт</label><input id="wtTakeoff" type="time" class="wt-field-input" value="10:30"></div>'+
    '<div><label class="wt-field-label">Посадка</label><input id="wtLanding" type="time" class="wt-field-input" value="13:45"></div>'+
    '<div><label class="wt-field-label">Выкл. двигателей</label><input id="wtEngineStop" type="time" class="wt-field-input" value="14:00"></div>'+
    '</div><div style="margin-bottom:16px;"><label class="wt-field-label">Послеполётные работы (мин)</label><input id="wtPostflight" type="number" class="wt-field-input" style="max-width:140px;" value="'+s.postflight+'"></div>';
}
function wtSaveSegment(){
  var pilotExtra=parseInt(wtVal('wtPilotExtra'),10)||0;
  var cabinExtra=parseInt(wtVal('wtCabinExtra'),10)||0;
  var landings=wtVal('wtLandings')||'1-2';
  var extension=parseInt(wtVal('wtExtension'),10)||0;
  var restType=wtVal('wtRestType')||'base';
  var reportTime=wtVal('wtReportTime')||'09:00';
  var postflight=parseInt(wtVal('wtPostflight'),10)||0;
  _wtSettings={pilotExtra:pilotExtra,cabinExtra:cabinExtra,landings:landings,extension:extension,restType:restType,reportTime:reportTime,postflight:postflight};
  wtSaveSettings(_wtSettings);
  var engineStart=wtParseTime(wtVal('wtEngineStart'));
  var takeoff=wtParseTime(wtVal('wtTakeoff'));
  var landing=wtParseTime(wtVal('wtLanding'));
  var engineStop=wtParseTime(wtVal('wtEngineStop'));
  if(engineStart===null||takeoff===null||landing===null||engineStop===null){ window.app.showToast('Заполните все времена сегмента (ЧЧ:ММ)'); return; }
  var flightTime=wtDiffTime(engineStart,engineStop);
  var airTime=wtDiffTime(takeoff,landing);
  if(flightTime<=0||airTime<=0){ window.app.showToast('Некорректный порядок времени'); return; }
  if(wtDiffTime(engineStart,takeoff)<0){ window.app.showToast('Взлёт не может быть раньше запуска двигателей'); return; }
  if(wtDiffTime(takeoff,landing)<0){ window.app.showToast('Посадка не может быть раньше взлёта'); return; }
  if(wtDiffTime(landing,engineStop)<0){ window.app.showToast('Выкл. двигателей не может быть раньше посадки'); return; }
  if(wtCheckOverlap(engineStart,engineStop,_wtSegments,-1)){ window.app.showToast('Сегмент пересекается по времени с существующим'); return; }
  _wtSegments.push({engineStart:engineStart,takeoff:takeoff,landing:landing,engineStop:engineStop,flightTime:flightTime,airTime:airTime});
  _wtFinalized=false;
  wtSaveSegments(_wtSegments);
  wtCloseSettings();
  window.app.showToast('Сегмент сохранён');
  wtRenderAll();
}
function wtDeleteSegment(idx){
  if(idx<0||idx>=_wtSegments.length) return;
  _wtSegments.splice(idx,1);
  _wtFinalized=false;
  wtSaveSegments(_wtSegments);
  wtRenderAll();
}
function wtReset(){
  _wtSegments=[];
  _wtFinalized=false;
  wtSaveSegments(_wtSegments);
  window.app.showToast('Все сегменты удалены');
  wtRenderAll();
}
function wtFinalize(){
  if(_wtSegments.length===0){ window.app.showToast('Нет ни одного сегмента'); return; }
  var reportMin=wtParseTime(_wtSettings.reportTime);
  if(reportMin===null){ window.app.showToast('Укажите время явки в настройках'); return; }
  _wtFinalized=true;
  wtCloseSettings();
  window.app.showToast('Расчёт завершён');
  wtRenderAll();
}
function wtShareResults(){
  var results=wtCalcResults(_wtSegments,_wtSettings);
  if(!results) return;
  var lines=['✈ РАСЧЁТ РАБОЧЕГО ВРЕМЕНИ ЭКИПАЖА','━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━','Явка: '+_wtSettings.reportTime,'Ночная смена: '+(results.night?'Да':'Нет'),'Посадки: '+_wtSettings.landings,'Продление КВС: '+(_wtSettings.extension>0?'+'+_wtSettings.extension+' ч':'Нет'),''];
  for(var i=0;i<_wtSegments.length;i++){ var seg=_wtSegments[i]; lines.push('Сегмент '+(i+1)+': '+wtFormatTime(seg.engineStart)+'–'+wtFormatTime(seg.engineStop)+' | Полётное: '+wtFmtMin(seg.flightTime)+' | Лётное: '+wtFmtMin(seg.airTime)); }
  lines.push('','Фактическое рабочее время: '+wtFmtMin(results.duty),'Полётное время: '+wtFmtMin(results.totalFlight),'Лётное время: '+wtFmtMin(results.totalAir),'Окончание смены: '+wtFormatTime(results.shiftEnd),'Минимальный отдых: '+results.restHours+' ч','Окончание отдыха: '+wtFormatTime(results.restEnd),'');
  if(results.warnings.length>0){ lines.push('⚠ НАРУШЕНИЯ FTL:'); for(var j=0;j<results.warnings.length;j++) lines.push('  • '+results.warnings[j]); }
  else lines.push('✅ Нарушений не обнаружено. Соответствие нормам FTL.');
  lines.push('',"Pilot's Tool — Nordwind Airlines");
  var text=lines.join('\n');
  if(navigator.share){ navigator.share({title:'Расчёт рабочего времени',text:text}).catch(function(){ wtCopyToClipboard(text); }); }
  else{ wtCopyToClipboard(text); }
}
function wtCopyToClipboard(text){
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(function(){ window.app.showToast('Результаты скопированы'); }).catch(function(){ window.app.showToast('Не удалось скопировать'); }); }
  else{ window.app.showToast('Не удалось скопировать'); }
}
function wtRenderHeader(){
  var left=document.getElementById('headerLeft');
  var center=document.getElementById('headerCenter');
  var right=document.getElementById('headerRight');
  left.innerHTML='<button class="icon-btn" aria-label="Назад">'+window.ICONS.back+'</button>';
  left.onclick=function(){ window.app.navigateTo('main'); };
  center.innerHTML='<div class="hc-default">Рабочее время</div>';
  right.innerHTML='<button class="icon-btn" id="wtSettingsBtn" aria-label="Настройки">'+window.ICONS.settings+'</button>';
  right.onclick=null;
  var settingsBtn=document.getElementById('wtSettingsBtn');
  if(settingsBtn) settingsBtn.addEventListener('click',wtOpenSettings);
}
function initWorktime(){
  var container=document.getElementById('worktimeContainer');
  if(!container){ console.error('Контейнер worktimeContainer не найден!'); return; }
  if(!container.dataset.delegated){
    container.addEventListener('click',function(e){
      var delBtn=e.target.closest('.delete-segment');
      if(delBtn){ var idx=parseInt(delBtn.dataset.idx,10); wtDeleteSegment(idx); return; }
      if(e.target.closest('#wtFinalizeBtn')){ wtFinalize(); return; }
      if(e.target.closest('#wtResetBtn')){ window.app.showConfirm('Удалить все сегменты и сбросить расчёт?',function(){ wtReset(); },'Сбросить'); return; }
      if(e.target.closest('#wtAddFirstBtn')){ wtOpenSettings(); return; }
      if(e.target.closest('#wtShareBtn')){ wtShareResults(); return; }
    });
    container.dataset.delegated='true';
  }
  var overlay=document.getElementById('wtSettingsOverlay');
  if(overlay&&!overlay.dataset.delegated){
    overlay.addEventListener('click',function(e){ if(e.target===overlay) wtCloseSettings(); });
    overlay.dataset.delegated='true';
  }
  var sheet=document.getElementById('wtSettingsSheet');
  if(sheet&&!sheet.dataset.delegated){
    sheet.addEventListener('click',function(e){
      if(e.target.closest('#wtSaveSegmentBtn')){ wtSaveSegment(); return; }
      if(e.target.closest('#wtCloseSettingsBtn')){ wtCloseSettings(); return; }
      if(e.target.closest('#wtCloseSettingsBtn2')){ wtCloseSettings(); return; }
    });
    sheet.dataset.delegated='true';
  }
  _wtSettings=wtLoadSettings();
  _wtSegments=wtLoadSegments();
  _wtFinalized=false;
  wtRenderHeader();
  wtRenderAll();
}