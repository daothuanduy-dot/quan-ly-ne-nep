import {supabase} from './config.js?v=3.0.5.25.25';

// Các mức điểm cố định được lấy trực tiếp từ văn bản tiêu chí thi đua 2025-2026.
// Những nội dung có khoảng điểm hoặc "tùy mức độ" không được tự chọn một mức mặc định.
export const DEFAULT_BASE_SCORES = {
  'Học tập':200,
  'Nề nếp':200,
  'Lao động - CSVC':100,
  'Tập trung':100,
  'Đoàn - Ngoại khóa':100
};

const C=(ma_hd,ten_hd,mang,loai,diem,doi_tuong)=>({ma_hd,ten_hd,mang,loai,diem,doi_tuong});
export const DEFAULT_CRITERIA=[
 C('VB_HOC_SDB_9','Sổ đầu bài: có 1 điểm 9','Học tập','Vi phạm',-1,'Tập thể'),
 C('VB_HOC_SDB_8','Sổ đầu bài: có 1 điểm 8','Học tập','Vi phạm',-2,'Tập thể'),
 C('VB_HOC_SDB_7','Sổ đầu bài: có 1 điểm 7','Học tập','Vi phạm',-3,'Tập thể'),
 C('VB_HOC_SDB_6','Sổ đầu bài: có 1 điểm 6','Học tập','Vi phạm',-4,'Tập thể'),
 C('VB_HOC_SDB_5','Sổ đầu bài: có 1 điểm 5','Học tập','Vi phạm',-5,'Tập thể'),
 C('VB_HOC_SDB_4','Sổ đầu bài: có 1 điểm 4','Học tập','Vi phạm',-6,'Tập thể'),
 C('VB_HOC_SDB_3','Sổ đầu bài: có 1 điểm 3','Học tập','Vi phạm',-7,'Tập thể'),
 C('VB_HOC_SDB_2','Sổ đầu bài: có 1 điểm 2','Học tập','Vi phạm',-8,'Tập thể'),
 C('VB_HOC_SDB_1','Sổ đầu bài: có 1 điểm 1','Học tập','Vi phạm',-9,'Tập thể'),
 C('VB_HOC_SDB_0','Sổ đầu bài: có 1 điểm 0','Học tập','Vi phạm',-10,'Tập thể'),
 C('VB_HOC_SDB_THIEU','Sổ đầu bài: không ghi đúng, đầy đủ phần ghi của học sinh','Học tập','Vi phạm',-1,'Tập thể'),
 C('VB_HOC_TONGKET_TUAN','Học sinh không tổng kết tuần','Học tập','Vi phạm',-2,'Tập thể'),
 C('VB_HOC_DIEM_MIEN_8','Điểm miệng học sinh: 1 điểm 8','Học tập','Khen thưởng',0.25,'Tập thể'),
 C('VB_HOC_DIEM_MIEN_9','Điểm miệng học sinh: 1 điểm 9','Học tập','Khen thưởng',0.5,'Tập thể'),
 C('VB_HOC_DIEM_MIEN_10','Điểm miệng học sinh: 1 điểm 10','Học tập','Khen thưởng',1,'Tập thể'),
 C('VB_HOC_APP_TOP3','Tham gia đủ 100% và đứng Top 3 (Ban) thi qua App','Học tập','Khen thưởng',5,'Tập thể'),
 C('VB_HOC_THI_TL','Vi phạm quy chế thi: sử dụng tài liệu/điện thoại/thiết bị thu phát tín hiệu','Học tập','Vi phạm',-15,'Tập thể'),
 C('VB_HOC_THI_TRAO_DOI','Vi phạm quy chế thi: trao đổi giấy nháp/bài làm/đề/đổi mã đề/ngồi sai chỗ','Học tập','Vi phạm',-10,'Tập thể'),
 C('VB_HOC_THI_NHAC_BAI','Vi phạm quy chế thi: trao đổi, nhắc bài bằng lời nói/ký hiệu','Học tập','Vi phạm',-5,'Tập thể'),

 C('VB_NE_MUON','Học sinh đi học muộn','Nề nếp','Vi phạm',-1,'Cá nhân'),
 C('VB_NE_MUON_QUA1TIET','Học sinh đi học muộn quá 1 tiết','Nề nếp','Vi phạm',-2,'Cá nhân'),
 C('VB_NE_MUON_COPHEP','Học sinh đi học muộn có phép','Nề nếp','Vi phạm',-0.75,'Cá nhân'),
 C('VB_NE_VAOLOPMUON','Học sinh vào lớp muộn các tiết/đứng ngoài hành lang','Nề nếp','Vi phạm',-0.5,'Cá nhân'),
 C('VB_NE_TROTIET','Học sinh trốn tiết/bỏ ra ngoài trong giờ học','Nề nếp','Vi phạm',-2,'Cá nhân'),
 C('VB_NE_DONGPHUC','Vi phạm đồng phục','Nề nếp','Vi phạm',-2,'Cá nhân'),
 C('VB_NE_TOC_TRANGDIEM','Nữ nhuộm tóc/trang điểm tô son hoặc nam để tóc không đúng quy định','Nề nếp','Vi phạm',-2,'Cá nhân'),
 C('VB_NE_HUYHIEU','Không đeo huy hiệu Đoàn/huy hiệu Thanh niên','Nề nếp','Vi phạm',-0.5,'Cá nhân'),
 C('VB_NE_DIEN_THOAI','Sử dụng điện thoại trong buổi học','Nề nếp','Vi phạm',-5,'Cá nhân'),
 C('VB_NE_THUOC_CHATKICH','Hút thuốc/sử dụng chất kích thích/thuốc lá điện tử','Nề nếp','Vi phạm',-10,'Cá nhân'),
 C('VB_NE_GUIXE_NGOAI','Gửi xe ngoài trường','Nề nếp','Vi phạm',-4,'Cá nhân'),
 C('VB_NE_KHONG_MU_BH','Không đội mũ bảo hiểm','Nề nếp','Vi phạm',-4,'Cá nhân'),
 C('VB_NE_MOTO50','Tự đi mô-tô trên 50cm3 khi chưa có giấy phép lái xe','Nề nếp','Vi phạm',-10,'Cá nhân'),
 C('VB_NE_BONG_SAN','Đá bóng trong sân trường','Nề nếp','Vi phạm',-2,'Cá nhân'),
 C('VB_NE_BONG_HANHLANG','Đá bóng ở hành lang','Nề nếp','Vi phạm',-5,'Tập thể'),
 C('VB_NE_NOITUC_XOAXAT','Nói tục/chửi bậy/xô xát/đánh/cãi nhau','Nề nếp','Vi phạm',-5,'Cá nhân'),
 C('VB_NE_LON_XON','Nô nghịch quá mức/gây lộn xộn, mất trật tự','Nề nếp','Vi phạm',-5,'Cá nhân'),
 C('VB_NE_SDB_MUON','Nộp/lấy Sổ đầu bài muộn','Nề nếp','Vi phạm',-0.5,'Tập thể'),
 C('VB_NE_SDB_KHONG','Không nộp/không nhận Sổ đầu bài','Nề nếp','Vi phạm',-1,'Tập thể'),
 C('VB_NE_BAOCAO_SAI','Báo cáo sai lệch thông tin','Nề nếp','Vi phạm',-4,'Cá nhân'),
 C('VB_NE_CODO_MUON','Cờ đỏ: lớp xuống trực muộn','Nề nếp','Vi phạm',-2,'Tập thể'),
 C('VB_NE_CODO_THIEU','Cờ đỏ: lớp thiếu người trực','Nề nếp','Vi phạm',-1,'Tập thể'),
 C('VB_NE_CODO_KHONG','Cờ đỏ: lớp không xuống trực','Nề nếp','Vi phạm',-5,'Tập thể'),
 C('VB_NE_CODO_SOSAI','Cờ đỏ: ghi sổ sơ sài/thiếu thông tin/thiếu ngày trực','Nề nếp','Vi phạm',-2,'Tập thể'),
 C('VB_NE_CODO_SAIHS','Cờ đỏ: ghi sổ sai thông tin học sinh','Nề nếp','Vi phạm',-5,'Cá nhân'),
 C('VB_NE_CODO_THAIDO','Cờ đỏ: thái độ trực không nghiêm túc','Nề nếp','Vi phạm',-3,'Cá nhân'),

 C('VB_LD_BAN','Vệ sinh lớp bẩn','Lao động - CSVC','Vi phạm',-3,'Tập thể'),
 C('VB_LD_KHONG_TRUCNHAT','Không trực nhật sau khi hết buổi học','Lao động - CSVC','Vi phạm',-3,'Tập thể'),
 C('VB_LD_HANHLANG_RAC','Khu vực hành lang lớp có rác','Lao động - CSVC','Vi phạm',-1,'Tập thể'),
 C('VB_LD_BAN_TUONG_THIETBI','Tường/trần/nền/thiết bị/thùng rác khu vực lớp bẩn, bừa bộn','Lao động - CSVC','Vi phạm',-2,'Tập thể'),
 C('VB_LD_KHONG_THAMGIA','Lớp không tham gia lao động theo phân công','Lao động - CSVC','Vi phạm',-10,'Tập thể'),
 C('VB_LD_VUT_RAC','Học sinh vứt rác không đúng nơi quy định','Lao động - CSVC','Vi phạm',-3,'Cá nhân'),
 C('VB_LD_THUE_NGUOI','Lớp thuê người khác vệ sinh hộ','Lao động - CSVC','Vi phạm',-10,'Tập thể'),
 C('VB_LD_PHATGIAC_RAC','Phát giác/báo cáo học sinh vứt rác hoặc thuê người vệ sinh hộ','Lao động - CSVC','Khen thưởng',3,'Tập thể'),
 C('VB_LD_TAT_DIEN_LOP','Không ngắt điện/quạt/điều hòa phòng học','Lao động - CSVC','Vi phạm',-5,'Tập thể'),
 C('VB_LD_TAT_DIEN_PHONG','Không ngắt thiết bị tại phòng sau khi sử dụng','Lao động - CSVC','Vi phạm',-5,'Tập thể'),
 C('VB_LD_DONG_CUA','Không đóng cửa sổ/cửa chính sau khi hết buổi học','Lao động - CSVC','Vi phạm',-5,'Tập thể'),
 C('VB_LD_HONG_TAISAN','Thiếu ý thức bảo vệ làm hỏng tài sản chung','Lao động - CSVC','Vi phạm',-10,'Tập thể'),
 C('VB_LD_BAOVE_CSVC','Có hành động góp phần bảo vệ, giữ gìn cơ sở vật chất','Lao động - CSVC','Khen thưởng',5,'Tập thể'),

 C('VB_TT_MUON','Lớp bị nhắc tập trung chậm, muộn','Tập trung','Vi phạm',-5,'Tập thể'),
 C('VB_TT_MUON10','Lớp tập trung muộn từ 10 phút trở lên','Tập trung','Vi phạm',-10,'Tập thể'),
 C('VB_TT_THIEU_QUANSO','Không đảm bảo quân số trước và sau buổi lễ','Tập trung','Vi phạm',-2,'Cá nhân'),
 C('VB_TT_MATTRAT','Học sinh mất trật tự/nói chuyện riêng bị phê bình','Tập trung','Vi phạm',-10,'Cá nhân'),
 C('VB_TT_PHABINH','Tập thể hoặc cá nhân bị phê bình trong buổi tập trung','Tập trung','Vi phạm',-10,'Tập thể'),
 C('VB_TT_DIEN_THOAI','Học sinh sử dụng điện thoại trong buổi tập trung','Tập trung','Vi phạm',-10,'Cá nhân'),
 C('VB_TT_KHONGHANG','Ngồi không thành hàng/nói chuyện bị nhắc nhở','Tập trung','Vi phạm',-10,'Tập thể'),
 C('VB_TT_ANQUA','Ăn quà vặt trong hàng','Tập trung','Vi phạm',-2,'Cá nhân'),
 C('VB_TT_RAKHOIVI_TRI','Tự do ra khỏi vị trí của lớp','Tập trung','Vi phạm',-2,'Cá nhân'),
 C('VB_TT_KHONGTHUDON','Không thu dọn ghế ngồi/biển lớp','Tập trung','Vi phạm',-5,'Tập thể'),
 C('VB_TT_VUTRAC','Vứt rác/không thu dọn rác khu vực lớp sau tập trung','Tập trung','Vi phạm',-5,'Tập thể'),

 C('VB_DOAN_THAMGIA','Tham gia hoạt động do Đoàn trường triệu tập','Đoàn - Ngoại khóa','Khen thưởng',5,'Tập thể'),
 C('VB_DOAN_CONGTRINH','Thực hiện tốt công trình thanh niên có đăng ký','Đoàn - Ngoại khóa','Khen thưởng',2,'Tập thể'),
 C('VB_DOAN_HIEUQUA','Tham gia nhiệt tình, hiệu quả hoạt động Đoàn','Đoàn - Ngoại khóa','Khen thưởng',2,'Tập thể'),
 C('VB_DOAN_XUATSAC','Tham gia hoạt động Đoàn xuất sắc','Đoàn - Ngoại khóa','Khen thưởng',5,'Tập thể'),
 C('VB_DOAN_CHIDOAN','Chi đoàn lớp tổ chức hoạt động điểm','Đoàn - Ngoại khóa','Khen thưởng',10,'Tập thể'),
 C('VB_DOAN_TINHNGUYEN','Tham gia hoạt động tình nguyện của Đoàn','Đoàn - Ngoại khóa','Khen thưởng',2,'Tập thể'),
 C('VB_DOAN_LAMVIECTOT','Học sinh làm việc tốt','Đoàn - Ngoại khóa','Khen thưởng',2,'Cá nhân'),
 C('VB_DOAN_MUON','Đi muộn hoạt động Đoàn/ngoại khóa/họp Đoàn','Đoàn - Ngoại khóa','Vi phạm',-1,'Cá nhân'),
 C('VB_DOAN_NGHIKHONGPHEP','Nghỉ không có lý do chính đáng','Đoàn - Ngoại khóa','Vi phạm',-2,'Cá nhân'),
 C('VB_DOAN_DONGPHI_MUON','Đóng góp Đoàn phí/khoản ủng hộ muộn','Đoàn - Ngoại khóa','Vi phạm',-1,'Tập thể'),
 C('VB_DOAN_KHONG_THAMGIA_TRIEUTAP','Không tham gia hoạt động theo giấy triệu tập','Đoàn - Ngoại khóa','Vi phạm',-2,'Cá nhân'),
 C('VB_DOAN_KHONG_THAMGIA','Không tham gia hoạt động do Đoàn trường/nhà trường phát động','Đoàn - Ngoại khóa','Vi phạm',-2,'Cá nhân'),
 C('VB_DOAN_KHONG_THAMGIA_LOP','Không tham gia hoạt động do Đoàn trường/nhà trường phát động - tập thể','Đoàn - Ngoại khóa','Vi phạm',-10,'Tập thể'),
 C('VB_DOAN_DAIHOI_SAIKH','Đại hội chi đoàn không đúng kế hoạch','Đoàn - Ngoại khóa','Vi phạm',-4,'Tập thể'),
 C('VB_DOAN_BIENBAN_MUON','Nộp biên bản/thông báo Đại hội muộn','Đoàn - Ngoại khóa','Vi phạm',-2,'Tập thể')
];

export async function applyDefaultCriteria(){
  const {data:existing,error:e}=await supabase.from('danh_muc_diem').select('ma_hd');
  if(e)return {ok:false,message:e.message,count:0};
  const existingSet=new Set((existing||[]).map(x=>String(x.ma_hd)));
  const missing=DEFAULT_CRITERIA.filter(x=>!existingSet.has(x.ma_hd));
  const present=DEFAULT_CRITERIA.filter(x=>existingSet.has(x.ma_hd));
  if(present.length){const {error}=await supabase.from('danh_muc_diem').upsert(present,{onConflict:'ma_hd'});if(error)return {ok:false,message:error.message,count:0};}
  if(missing.length){const {error}=await supabase.from('danh_muc_diem').insert(missing);if(error)return {ok:false,message:error.message,count:0};}
  return {ok:true,count:DEFAULT_CRITERIA.length};
}
