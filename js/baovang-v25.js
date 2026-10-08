/* QLNN V3.0.5.25.13 - Bao vang - standalone module */
var BV25 = (function(){
  var root = null;
  var roster = [];
  var students = [];
  var selectedGrade = '';
  var selectedClass = '';
  var reportDate = '';
  var sessionName = 'Sáng';
  var autoSession = 'Sáng';
  var manualSession = false;

  function app(){ return window.App || {}; }
  function sb(){ return app().supabase; }
  function cfg(){ return app().appConfig || {namHoc:''}; }
  function esc(v){
    if (app().esc) return app().esc(v);
    return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function toast(msg,type){ if(app().toast) app().toast(msg,type || ''); else alert(msg); }
  function norm(v){ return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
  function gradeKey(v){ var m=String(v == null ? '' : v).match(/(?:khoi|khối)?\s*(10|11|12)/i); return m ? m[1] : String(v == null ? '' : v).replace(/[^0-9]/g,''); }
  function gradeLabel(v){ var k=gradeKey(v); return k ? 'Khối ' + k : String(v == null ? '' : v).trim(); }
  function sameGrade(a,b){ var x=gradeKey(a), y=gradeKey(b); return !!x && x === y; }
  function active(r){ var s=norm(r && r.trang_thai); return !s || s==='active' || s==='dang hoc' || s==='hoc' || s==='true' || s==='1'; }
  function dateLocal(d){ var y=d.getFullYear(); var m=String(d.getMonth()+1); var day=String(d.getDate()); if(m.length<2)m='0'+m; if(day.length<2)day='0'+day; return y+'-'+m+'-'+day; }
  function dateText(v){ if(!v)return ''; var m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3]+'/'+m[2]+'/'+m[1] : String(v); }
  function sortText(a,b){ return String(a).localeCompare(String(b),'vi',{numeric:true,sensitivity:'base'}); }
  function showError(msg){ if(root){ var box=root.querySelector('#absRows'); if(box)box.innerHTML='<div class="danger-box">'+esc(msg)+'</div>'; } }
  function reject(title,msg,type){ toast(title+': '+msg,type || 'err'); }

  async function allRows(factory){
    var out=[], from=0, size=1000;
    while(true){
      var q=await factory().range(from,from+size-1);
      if(q.error) throw q.error;
      var rows=q.data || [];
      out=out.concat(rows);
      if(rows.length < size) break;
      from += size;
    }
    return out;
  }

  async function currentSession(now){
    var minutes=now.getHours()*60+now.getMinutes();
    try{
      var q=await sb().from('cai_dat_thoi_gian').select('buoi,gio_bat_dau_diem_danh,gio_ket_thuc_diem_danh').eq('nam_hoc',cfg().namHoc).eq('trang_thai','Học');
      if(!q.error){
        for(var i=0;i<(q.data||[]).length;i++){
          var r=q.data[i];
          var a=String(r.gio_bat_dau_diem_danh||'').slice(0,5);
          var b=String(r.gio_ket_thuc_diem_danh||'').slice(0,5);
          if(a && b){
            var ap=Number(a.slice(0,2))*60+Number(a.slice(3,5));
            var bp=Number(b.slice(0,2))*60+Number(b.slice(3,5));
            if(minutes>=ap && minutes<=bp) return r.buoi || 'Sáng';
          }
        }
      }
    }catch(e){}
    if(minutes>=840 && minutes<=1110) return 'Chiều';
    return minutes<840 ? 'Sáng' : 'Chiều';
  }

  function classList(){
    var m={}, out=[];
    for(var i=0;i<roster.length;i++){
      var r=roster[i];
      if(!active(r) || !r.lop) continue;
      var lop=String(r.lop).trim();
      if(!m[lop]) m[lop]={lop:lop,khoi:gradeLabel(r.khoi || lop)};
    }
    Object.keys(m).forEach(function(k){out.push(m[k]);});
    return out;
  }

  async function init(el){
    root=el;
    reportDate=dateLocal(new Date());
    autoSession=await currentSession(new Date());
    sessionName=autoSession;
    selectedGrade=''; selectedClass=''; students=[]; manualSession=false;
    render();
    await loadRoster();
    renderGrades();
  }

  function render(){
    root.innerHTML =
      '<div class="absence-hero">'+
        '<div class="absence-hero-icon">📋</div><div class="absence-hero-copy"><div class="absence-kicker">ĐIỂM DANH VẮNG</div><h2>Báo vắng học sinh</h2><p>Chọn ngày, buổi và lớp. Hệ thống chỉ ghi nhận khi lớp có lịch học trong TKB.</p></div><span class="absence-year">Năm học '+esc(cfg().namHoc)+'</span>'+ 
      '</div>'+ 
      '<div class="absence-steps">'+
        '<div class="absence-step active"><b>1</b><span>Thời gian</span></div><div class="absence-step"><b>2</b><span>Chọn lớp</span></div><div class="absence-step"><b>3</b><span>Số vắng</span></div><div class="absence-step"><b>4</b><span>Xác nhận</span></div>'+ 
      '</div>'+ 
      '<div class="absence-top-grid modern-absence-grid">'+
        '<div class="absence-box absence-box-time"><div class="selector-title"><span class="selector-icon blue">📅</span> Thời gian</div><label class="big-field">Ngày<input id="bvDate" type="date" value="'+esc(reportDate)+'"></label><div class="session-pill"><span>Buổi hệ thống</span><b id="bvAuto">'+esc(autoSession)+'</b><em>Tự động</em></div><label class="manual-session-toggle modern-toggle"><input id="bvManual" type="checkbox"> <span>Báo bổ sung / chọn lại buổi</span></label><select id="bvSession" disabled><option value="Sáng">Sáng</option><option value="Chiều">Chiều</option></select></div>'+ 
        '<div class="absence-box"><div class="selector-title"><span class="selector-icon purple">👥</span> Chọn khối</div><div id="bvGrades" class="absence-grade-grid modern-choice-grid"><span class="class-empty">Đang tải...</span></div><div class="box-note">Chạm vào một khối để tiếp tục.</div></div>'+ 
        '<div class="absence-box"><div class="selector-title"><span class="selector-icon green">🏫</span> Chọn lớp</div><div id="bvClasses" class="absence-class-grid modern-choice-grid"><span class="class-empty">Hãy chọn khối trước.</span></div><div id="bvSchedule" class="schedule-status idle"><span>💡</span><div><b>Chưa chọn lớp</b><small>Hãy chọn lớp để kiểm tra lịch học.</small></div></div></div>'+ 
        '<div class="absence-box absence-box-count"><div class="selector-title"><span class="selector-icon pink">👤</span> Số học sinh vắng</div><div class="count-select-wrap"><select id="bvCount" disabled><option value="">-- Chọn lớp trước --</option></select><span>học sinh</span></div><div id="bvInfo" class="selector-hint">Chưa chọn lớp.</div><div class="box-note">Chọn <b>0</b> nếu cả lớp đi học đầy đủ.</div></div>'+ 
      '</div>'+ 
      '<div id="absRows"><div class="absence-empty-hero"><div>📝</div><h3>Chưa bắt đầu báo vắng</h3><p>Chọn khối → lớp → số học sinh vắng để nhập danh sách.</p></div></div>';

    root.querySelector('#bvDate').onchange=function(e){reportDate=e.target.value; if(selectedClass)checkScheduleNotice();};
    root.querySelector('#bvManual').onchange=function(e){
      manualSession=e.target.checked; var s=root.querySelector('#bvSession'); s.disabled=!manualSession;
      if(manualSession)s.value=sessionName; else {sessionName=autoSession;s.value=autoSession;} if(selectedClass)checkScheduleNotice();
    };
    root.querySelector('#bvSession').onchange=function(e){sessionName=e.target.value;if(selectedClass)checkScheduleNotice();};
    root.querySelector('#bvCount').onchange=renderRows;
  }
  async function loadRoster(){
    try{
      roster=await allRows(function(){return sb().from('danh_sach').select('ma_hs,ho_ten,khoi,lop,ngay_sinh,trang_thai').not('lop','is',null).order('lop');});
      roster=roster.filter(active);
    }catch(e){showError('Không tải được danh sách học sinh: '+(e.message || e));}
  }

  function renderGrades(){
    var keys={};
    for(var i=0;i<roster.length;i++){var k=gradeKey(roster[i].khoi || roster[i].lop);if(k)keys[k]=true;}
    var arr=Object.keys(keys).sort(function(a,b){return Number(a)-Number(b);});
    var box=root.querySelector('#bvGrades');
    box.innerHTML=arr.map(function(k){return '<label class="absence-grade"><input type="radio" name="bvGrade" value="Khối '+k+'"><span>Khối '+k+'</span></label>';}).join('') || '<span class="class-empty">Không tìm thấy học sinh đang học.</span>';
    root.querySelectorAll('input[name="bvGrade"]').forEach(function(r){r.onchange=function(){selectGrade(r.value);};});
  }

  function selectGrade(g){
    selectedGrade=gradeLabel(g); selectedClass=''; students=[];
    var arr=classList().filter(function(x){return sameGrade(x.khoi,selectedGrade);});
    var scope=app().managedClasses ? app().managedClasses(app().Auth ? app().Auth.currentUser : null) : [];
    if(scope!==null && scope!==undefined) arr=arr.filter(function(x){return scope.indexOf(x.lop)>=0;});
    arr.sort(function(a,b){return sortText(a.lop,b.lop);});
    var box=root.querySelector('#bvClasses');
    box.innerHTML=arr.map(function(x){return '<label class="absence-class"><input type="radio" name="bvClass" value="'+esc(x.lop)+'"><span>'+esc(x.lop)+'</span></label>';}).join('') || '<span class="class-empty">Không có lớp trong phạm vi tài khoản.</span>';
    root.querySelector('#bvCount').disabled=true;
    root.querySelector('#bvCount').innerHTML='<option value="">-- Chọn lớp trước --</option>';
    root.querySelector('#absRows').innerHTML='';
    root.querySelectorAll('input[name="bvClass"]').forEach(function(r){r.onchange=function(){selectClass(r.value);};});
  }

  async function selectClass(cls){
    selectedClass=cls;
    students=roster.filter(function(s){return active(s) && String(s.lop||'').trim()===String(cls).trim() && sameGrade(s.khoi||s.lop,selectedGrade);});
    students.sort(function(a,b){return sortText(a.ho_ten||'',b.ho_ten||'');});
    var c=root.querySelector('#bvCount');
    c.disabled=false;
    var html='<option value="">-- Chọn số học sinh vắng --</option>';
    for(var i=0;i<=students.length;i++)html+='<option value="'+i+'">'+i+'</option>';
    c.innerHTML=html;
    root.querySelector('#bvInfo').innerHTML='<b>'+esc(cls)+'</b> · '+students.length+' học sinh · Chọn 0 nếu không có học sinh vắng.';
    await checkScheduleNotice();
    root.querySelector('#absRows').innerHTML='<div class="empty">Chọn số vắng. Chọn 0 để xác nhận lớp đã báo.</div>';
  }

  async function checkScheduleNotice(){
    if(!selectedClass)return;
    var ok=await hasSchedule(selectedClass,reportDate,sessionName);
    var info=root.querySelector('#bvInfo'); var box=root.querySelector('#bvSchedule');
    if(info){info.innerHTML='<b>'+esc(selectedClass)+'</b> · '+students.length+' học sinh';}
    if(box){
      box.className='schedule-status '+(ok?'ready':'blocked');
      box.innerHTML=ok?'<span class="schedule-ok-icon">✓</span><div><b>Có lịch học</b><small>'+esc(dateText(reportDate))+' · '+esc(sessionName)+' · Có thể ghi báo vắng.</small></div>':'<span class="schedule-warn-icon">!</span><div><b>Chưa có lịch học</b><small>'+esc(dateText(reportDate))+' · '+esc(sessionName)+' · Hệ thống sẽ không ghi dữ liệu.</small></div>';
    }
    var saveBtns=root.querySelectorAll('#bvSave,#bvSaveZero');
    saveBtns.forEach(function(btn){btn.disabled=!ok;btn.classList.toggle('disabled',!ok);});
  }

  function row(i){
    var opts='<option value="">-- Chọn học sinh --</option>';
    for(var j=0;j<students.length;j++)opts+='<option value="'+j+'">'+esc(students[j].ho_ten)+' — '+esc(students[j].ngay_sinh || '')+'</option>';
    return '<div class="absence-row" data-row="'+i+'"><div class="absence-index">'+(i+1)+'</div><div class="absence-student-wrap"><label>Học sinh<select class="absence-student">'+opts+'</select></label></div><div class="absence-status"><span class="status-label">Trạng thái</span><label class="absence-status-radio allowed"><input type="radio" name="bvStatus_'+i+'" value="Vắng có phép"><span>✓ Có phép</span></label><label class="absence-status-radio notallowed"><input type="radio" name="bvStatus_'+i+'" value="Vắng không phép"><span>✕ Không phép</span></label></div></div>';
  }

  function renderRows(){
    var c=root.querySelector('#bvCount'); var box=root.querySelector('#absRows');
    if(c.value===''){box.innerHTML='<div class="empty">Hãy chọn số học sinh vắng.</div>';return;}
    var n=Number(c.value||0);
    if(n===0){
      box.innerHTML='<div class="absence-panel zero-report"><div class="zero-icon">✓</div><div><h3>Không có học sinh vắng</h3><p>Lớp <b>'+esc(selectedClass)+'</b> sẽ được ghi nhận vắng 0 cho '+esc(sessionName)+' ngày '+dateText(reportDate)+'.</p><button id="bvSaveZero" class="btn primary">💾 Xác nhận lớp không có học sinh vắng</button></div>';
      root.querySelector('#bvSaveZero').onclick=saveZero; checkScheduleNotice();
      return;
    }
    var html='<div class="absence-panel"><h3>Danh sách học sinh vắng — '+esc(selectedClass)+'</h3><p>'+n+' học sinh cần xác nhận trạng thái.</p><div class="absence-list">';
    for(var i=0;i<n;i++)html+=row(i);
    html+='</div><div class="action-row"><button id="bvSave" class="btn primary">💾 Ghi nhận '+n+' học sinh vắng</button></div></div>';
    box.innerHTML=html;
    root.querySelectorAll('.absence-student').forEach(function(s){s.onchange=disableDuplicates;});
    root.querySelector('#bvSave').onclick=save; checkScheduleNotice();
  }

  function disableDuplicates(){
    var sels=Array.prototype.slice.call(root.querySelectorAll('.absence-student')); var chosen={};
    sels.forEach(function(s){if(s.value)chosen[s.value]=true;});
    sels.forEach(function(s){Array.prototype.forEach.call(s.options,function(o){if(o.value)o.disabled=!!chosen[o.value] && o.value!==s.value;});});
  }

  function cleanText(v){ return norm(v).replace(/\s+/g,' '); }
  function sameClassName(a,b){ return cleanText(a)===cleanText(b); }
  function sameYear(a,b){ return cleanText(a)===cleanText(b); }
  function validScheduleStatus(v){
    var st=cleanText(v);
    return !st || st==='hoat dong' || st==='active' || st==='true' || st==='1' || st==='hoc' || st==='dang hoc';
  }
  function scheduleSession(v){
    var x=cleanText(v);
    if(x==='chieu') return 'chieu';
    if(x==='sang') return 'sang';
    return x;
  }
  async function getScheduleRowsByDay(thu){
    // Không lọc thu/ngày ở query để tránh sai khác kiểu dữ liệu giữa các bản ghi cũ.
    var q=await sb().from('thoi_khoa_bieu').select('nam_hoc,thu,buoi,khoi,lop,trang_thai');
    if(q.error) throw q.error;
    return q.data || [];
  }
  function scheduleDay(v){
    var n=Number(String(v==null?'':v).trim());
    return Number.isFinite(n) ? n : 0;
  }
  function scheduleActive(v){
    var st=cleanText(v);
    if(!st) return true;
    return !['inactive','tam dung','tam dung hoc','disabled','ngung','khong hoat dong'].includes(st);
  }
  async function hasSchedule(cls,day,session){
    var d=new Date(String(day)+'T12:00:00');
    if(isNaN(d.getTime())) return false;
    var dow=d.getDay();
    var wantedDay=dow===0?8:dow+1;
    var wantedSession=scheduleSession(session);
    var wantedClass=cleanText(cls);
    var wantedYear=cleanText(cfg().namHoc);
    var wantedGrade=gradeKey(selectedGrade);
    try{
      var rows=await getScheduleRowsByDay(wantedDay);
      for(var i=0;i<rows.length;i++){
        var r=rows[i];
        if(scheduleDay(r.thu)!==wantedDay) continue;
        if(!scheduleActive(r.trang_thai)) continue;
        var y=cleanText(r.nam_hoc);
        // Cho phép các bản ghi TKB cũ chưa có năm học; nếu đã có thì phải đúng năm hiện tại.
        if(y && wantedYear && y!==wantedYear) continue;
        if(scheduleSession(r.buoi)!==wantedSession) continue;
        var lop=cleanText(r.lop);
        var khoi=gradeKey(r.khoi);
        if(lop && lop===wantedClass) return true;
        if(!lop && khoi && wantedGrade && khoi===wantedGrade) return true;
        if(!lop && !khoi) return true;
      }
      return false;
    }catch(e){
      toast('Không kiểm tra được TKB: '+(e.message || e),'err');
      return false;
    }
  }

  function canReport(){
    var u=app().Auth ? app().Auth.currentUser : null;
    return app().canManageAbsence ? app().canManageAbsence(u,selectedClass) : false;
  }

  async function save(){
    if(!canReport()){reject('Không được phép báo vắng','Tài khoản hiện tại không có quyền báo vắng cho lớp '+selectedClass+'. Không ghi dữ liệu.');return;}
    if(!(await hasSchedule(selectedClass,reportDate,sessionName))){reject('Chưa thể ghi báo vắng','Lớp '+selectedClass+' chưa có lịch học '+sessionName+' ngày '+dateText(reportDate)+' trong TKB. Vui lòng kiểm tra TKB hoặc chọn báo bổ sung đúng buổi. Dữ liệu chưa được ghi.','warn');return;}
    var rows=Array.prototype.slice.call(root.querySelectorAll('.absence-row')); var payload=[];
    for(var i=0;i<rows.length;i++){
      var idx=rows[i].querySelector('.absence-student').value; var radio=rows[i].querySelector('input[type="radio"]:checked');
      if(idx===''){toast('Dòng '+(i+1)+': chưa chọn học sinh.','err');return;}
      if(!radio){toast('Dòng '+(i+1)+': chưa chọn Có phép/Không phép.','err');return;}
      var s=students[Number(idx)];
      payload.push({ma_hs:s.ma_hs,ho_ten:s.ho_ten,khoi:s.khoi,lop:s.lop,ngay_diem_danh:reportDate,buoi:sessionName,trang_thai:radio.value,chi_tiet:null,diem:0,ma_nguoi_cap_nhat:app().Auth && app().Auth.currentUser ? app().Auth.currentUser.ma_cb : null,ten_nguoi_cap_nhat:app().Auth && app().Auth.currentUser ? app().Auth.currentUser.ho_ten : null});
    }
    var q=await sb().from('diem_danh_master').insert(payload);
    if(q.error){toast('Không ghi được học sinh vắng: '+q.error.message,'err');return;}
    var e=await saveClassReport(payload.length);
    if(e){toast('Đã ghi học sinh nhưng chưa cập nhật trạng thái lớp: '+e,'err');return;}
    toast('Đã ghi nhận '+payload.length+' học sinh vắng.','ok');
  }

  async function saveZero(){
    if(!canReport()){reject('Không được phép báo vắng','Tài khoản hiện tại không có quyền báo vắng cho lớp '+selectedClass+'. Không ghi dữ liệu.');return;}
    if(!(await hasSchedule(selectedClass,reportDate,sessionName))){reject('Chưa thể ghi báo vắng','Lớp '+selectedClass+' chưa có lịch học '+sessionName+' ngày '+dateText(reportDate)+' trong TKB. Vui lòng kiểm tra TKB hoặc chọn báo bổ sung đúng buổi. Dữ liệu chưa được ghi.','warn');return;}
    var e=await saveClassReport(0);
    if(e){toast('Không ghi được trạng thái lớp: '+e,'err');return;}
    toast('Đã xác nhận '+selectedClass+': vắng 0.','ok');
  }

  async function saveClassReport(count){
    var base={nam_hoc:cfg().namHoc,ngay_bao:reportDate,buoi:sessionName,khoi:selectedGrade,lop:selectedClass,so_vang:count};
    var q=await sb().from('bao_vang_lop').select('nam_hoc,ngay_bao,buoi,lop,so_vang').eq('nam_hoc',cfg().namHoc).eq('ngay_bao',reportDate).eq('buoi',sessionName).eq('lop',selectedClass).limit(1);
    if(q.error)return q.error.message;
    if(q.data && q.data.length){var u=await sb().from('bao_vang_lop').update(base).eq('nam_hoc',cfg().namHoc).eq('ngay_bao',reportDate).eq('buoi',sessionName).eq('lop',selectedClass);return u.error ? u.error.message : null;}
    var i=await sb().from('bao_vang_lop').insert(base);return i.error ? i.error.message : null;
  }

  return {init:init};
})();
export async function init(el){ return BV25.init(el); }
