import {supabase,managedClasses,canViewAllStats,roleOf} from './config.js';
import {esc} from './ui.js';

async function fetchAll(factory, chunk=1000){
  const all=[];
  let from=0;
  while(true){
    const {data,error}=await factory().range(from,from+chunk-1);
    if(error) throw error;
    const rows=data||[];
    all.push(...rows);
    if(rows.length<chunk) break;
    from+=chunk;
  }
  return all;
}

export async function init(root){
  root.innerHTML=`
    <div class="page-head">
      <div>
        <h2>Thống Kê Biểu Đồ</h2>
        <p>Tổng hợp dữ liệu học sinh và lịch sử nề nếp/thi đua.</p>
      </div>
      <span class="badge ok">${roleOf(window.App?.Auth?.currentUser)==='GVCN'?'Toàn trường':'Theo phạm vi được phân công'}</span>
    </div>
    <div id="stats"><div class="empty">Đang tải...</div></div>
  `;
  await load(root);
}

async function load(root){
  try{
    // Không dùng limit(1000). PostgREST có thể giới hạn số dòng trả về,
    // nên lấy theo từng trang 1.000 và ghép toàn bộ dữ liệu.
    const [students,events]=await Promise.all([
      fetchAll(()=>supabase
        .from('danh_sach')
        .select('ma_hs,khoi,lop,trang_thai')
        .eq('trang_thai','Active')
        .order('id')),
      fetchAll(()=>supabase
        .from('diem_danh_master')
        .select('id,trang_thai,diem,lop,ngay_diem_danh,doi_tuong')
        .order('id'))
    ]);

    const user=window.App?.Auth?.currentUser;
    const scope=managedClasses(user);
    if(scope!==null){
      students.splice(0,students.length,...students.filter(x=>scope.includes(String(x.lop||'').trim())));
      events.splice(0,events.length,...events.filter(x=>scope.includes(String(x.lop||'').trim())));
    }

    const byGrade={};
    students.forEach(x=>{
      const g=String(x.khoi||'Chưa xác định').trim()||'Chưa xác định';
      byGrade[g]=(byGrade[g]||0)+1;
    });

    const plus=events
      .filter(x=>Number(x.diem)>0)
      .reduce((a,x)=>a+Number(x.diem||0),0);

    const minus=events
      .filter(x=>Number(x.diem)<0)
      .reduce((a,x)=>a+Number(x.diem||0),0);

    const late=events
      .filter(x=>String(x.trang_thai||'').toLowerCase().includes('muộn'))
      .length;

    const max=Math.max(1,...Object.values(byGrade));

    root.querySelector('#stats').innerHTML=`
      <div class="grid">
        <div class="stat">
          <div class="num">${students.length}</div>
          <div class="label">Học sinh đang hoạt động</div>
        </div>
        <div class="stat">
          <div class="num">${events.length}</div>
          <div class="label">Lượt ghi nhận</div>
        </div>
        <div class="stat">
          <div class="num">${plus>0?'+':''}${formatNumber(plus)}</div>
          <div class="label">Tổng điểm cộng</div>
        </div>
        <div class="stat">
          <div class="num">${formatNumber(minus)}</div>
          <div class="label">Tổng điểm trừ</div>
        </div>
        <div class="stat">
          <div class="num">${late}</div>
          <div class="label">Lượt đi muộn</div>
        </div>
      </div>

      <div style="height:16px"></div>

      <div class="panel">
        <div class="page-head">
          <div>
            <h3 style="margin:0">Quy mô học sinh theo khối</h3>
            <p>Đã tải toàn bộ học sinh Active, không giới hạn 1.000 bản ghi.</p>
          </div>
          <span class="badge">${students.length} học sinh</span>
        </div>
        <div class="chartbar">
          ${Object.entries(byGrade)
            .sort((a,b)=>a[0].localeCompare(b[0],'vi',{numeric:true}))
            .map(([k,v])=>`
              <div class="bar" style="height:${Math.max(12,v/max*170)}px">
                <em>${v}</em>
                <span>${esc(k)}</span>
              </div>
            `).join('')}
        </div>
      </div>
    `;
  }catch(error){
    root.querySelector('#stats').innerHTML=
      `<div class="danger-box">${esc(error.message||String(error))}</div>`;
  }
}

function formatNumber(n){
  const x=Number(n||0);
  return Number.isInteger(x)?String(x):x.toFixed(1).replace(/\.0$/,'');
}
