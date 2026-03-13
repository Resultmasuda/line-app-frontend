"use client";
import React, { useState, useEffect } from 'react';
import { Play, Square, MapPin, CalendarClock, Receipt, Settings, Home, Sun, Navigation } from 'lucide-react';
import Link from 'next/link';
import { useLiff } from '@/components/LiffProvider';
import { getUpcomingShifts, ShiftRecord, updateShiftPlanning } from '@/lib/api/shift';
import { recordAttendance, getTodayAttendances, AttendanceType, AttendanceRecord } from '@/lib/api/attendance';
import { getAllStores, getUserPermissions } from '@/lib/api/admin';

// 距離計算用の関数 (Haversine formula)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) *
    Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

export default function AppDashboard() {
  const { user, loading: liffLoading } = useLiff();

  const [lastAction, setLastAction] = useState<AttendanceType | null>(null);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [todayAttendances, setTodayAttendances] = useState<AttendanceRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // カスタム確認モーダル用
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string, action: () => void } | null>(null);

  // 翌日プランニング用モーダル
  const [planningShift, setPlanningShift] = useState<ShiftRecord | null>(null);
  const [plannedWakeUp, setPlannedWakeUp] = useState('');
  const [plannedLeave, setPlannedLeave] = useState('');
  const [dailyMemo, setDailyMemo] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // 共演者（同じ店舗・日付）のシフト情報
  const [coworkerShifts, setCoworkerShifts] = useState<any[]>([]);

  // デバッグ位置情報用 (Super Admin用)
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugLocation, setDebugLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [canViewCalendar, setCanViewCalendar] = useState(false);

  const SUPER_IDS = ['c42cb255-d3ad-41cb-9b48-e6ffcd2f6648', '87e75b91-210c-41bb-9cc3-cc7850d473d4'];
  const isSuperAdmin = user && SUPER_IDS.includes(user.id);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        // シフト取得 (今日以降5件取得して、より正確に次の予定を判断)
        const shiftRes = await getUpcomingShifts(user.id, 5);
        if (shiftRes.success && shiftRes.data && isMounted) {
          setShifts(shiftRes.data);
        }

        // 今日の打刻状態を取得
        const todayStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
        const attendRes = await getTodayAttendances(user.id, todayStr);
        if (attendRes.success && attendRes.data && isMounted) {
          setTodayAttendances(attendRes.data);
          if (attendRes.data.length > 0) {
            // 最後の打刻実績を確認
            const lastRecord = attendRes.data[attendRes.data.length - 1];
            setLastAction(lastRecord.type);
          } else {
            setLastAction(null);
          }
        }

        // 権限取得
        const permRes = await getUserPermissions(user.id);
        if (permRes.success && permRes.data && isMounted) {
          const hasCalPerm = permRes.data.some((p: any) => p.permission === 'MOBILE_CALENDAR_VIEW');
          setCanViewCalendar(hasCalPerm);
        }
      } catch (e) {
        console.error("Data fetch error", e);
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // 今日または次回のシフトの店舗情報に基づいて、一緒に働くメンバーのメモを取得
  useEffect(() => {
    let isMounted = true;
    const fetchCoworkers = async () => {
      if (shifts.length === 0) return;

      // 最初の「仕事 (work)」を対象にする
      const targetShift = shifts.find(s => s.shift_type === 'work');
      if (!targetShift) return;

      const { getStoreTodayShiftsWithMemos } = await import('@/lib/api/shift');
      const res = await getStoreTodayShiftsWithMemos(targetShift.location, targetShift.date);

      if (res.success && res.data && isMounted) {
        // 自分以外のシフト予定を抽出
        const others = res.data.filter(s => s.user_id !== user?.id);
        setCoworkerShifts(others);
      }
    };

    if (!isLoadingData) {
      fetchCoworkers();
    }

    return () => { isMounted = false; };
  }, [shifts, isLoadingData, user?.id]);

  // 位置情報の取得プロミス
  const getCurrentLocation = (): Promise<{ lat: number, lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          console.warn("Location fetch error:", err);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const handlePunch = async (type: AttendanceType, bypassDistanceCheck: boolean = false) => {
    if (!user || actionLoading) return;

    setActionLoading(true);

    try {
      // プライバシー保護のため、起床・出発時の位置情報取得は行わない
      const shouldFetchLocation = type === 'CLOCK_IN' || type === 'CLOCK_OUT';
      
      let location = null;
      if (shouldFetchLocation) {
        if (isDebugMode && debugLocation) {
          location = debugLocation;
        } else {
          location = await getCurrentLocation();
        }
      }

      const now = new Date();
      const todayStr = now.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // デバッグモードかつ位置情報未設定の場合は入力を促す
      if (shouldFetchLocation && isDebugMode && !debugLocation) {
        // 店舗リストをロードしておく
        const res = await getAllStores();
        if (res.success && res.data) setStores(res.data);
        setIsLocationModalOpen(true);
        setActionLoading(false);
        return;
      }

      // 距離アラートチェック
      if (shouldFetchLocation && location) {
        // 条件に合う今のシフトを探す（開始時間の前後2時間程度など）
        const todayShift = shifts.find(s => s.date === todayStr && s.shift_type === 'work');
        if (todayShift) {
          const storeRes = await getAllStores();
          if (storeRes.success && storeRes.data) {
            const store = storeRes.data.find(s => s.name === todayShift.location);
            if (store && store.latitude && store.longitude && store.radius_m) {
              const dist = getDistance(store.latitude, store.longitude, location.lat, location.lng);
              if (dist > store.radius_m) {
                if (!bypassDistanceCheck) {
                  setPendingConfirm({
                    message: '設定された店舗の付近にいません。本当に打刻しますか？',
                    action: () => handlePunch(type, true)
                  });
                  setActionLoading(false);
                  return; // ここで処理を中断
                }
              }
            }
          }
        }
      }

      const res = await recordAttendance({
        user_id: user.id,
        date: todayStr,
        type: type,
        latitude: location?.lat || null,
        longitude: location?.lng || null,
      });

      if (res.success && res.data) {
        setTodayAttendances(prev => [...prev, res.data]);
        setLastAction(type);

        // 退勤時に「次回のシフト（今日これからの2本目、または明日以降）」があればプランニングモーダルを表示
        if (type === 'CLOCK_OUT') {
          // 現在の時間より後のシフト、または明日以降のシフトを探す
          let nextShiftRecord = shifts.find(s =>
            (s.date === todayStr && s.start_time > timeStr) || (s.date > todayStr)
          );

          // 明日の予定がない場合は空のオブジェクト等で入力を促す（場所などを選ばせるため）
          if (!nextShiftRecord) {
            // 明日の日付をデフォルトにする
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
            
            // 入力を促すための仮のレコード (新規登録扱いにするために id なし)
            setPlanningShift({
              id: '', // 新規作成フラグとして使うか、あるいはUI側で「次回の予定を入力」と出す
              date: tomorrowStr,
              location: '',
              start_time: '09:00:00',
              end_time: '18:00:00',
              shift_type: 'work',
              user_id: user.id
            } as any);
            setPlannedWakeUp('07:00');
            setPlannedLeave('08:00');
            setDailyMemo('');
          } else if (nextShiftRecord.shift_type === 'work') {
            setPlanningShift(nextShiftRecord);
            setPlannedWakeUp(nextShiftRecord.planned_wake_up_time?.slice(0, 5) || '');
            setPlannedLeave(nextShiftRecord.planned_leave_time?.slice(0, 5) || '');
            setDailyMemo(nextShiftRecord.daily_memo || '');
          }
        }
      } else {
        alert("打刻の保存に失敗しました。電波の良いところで再度お試しください。");
      }
    } catch (e) {
      console.error(e);
      alert("通信エラーが発生しました。");
    } finally {
      setActionLoading(false);
    }
  };

  if (liffLoading || isLoadingData) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 pb-20">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // シフトを表示用に整理
  const now = new Date();
  const todayStr = now.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // TODAY: 今日一番早い仕事、または現在進行中の仕事
  const todayShift = shifts.find(s => s.date === todayStr && s.shift_type === 'work');

  // NEXT: 今日の2本目、または明日以降の最初の仕事
  const nextShift = shifts.find(s =>
    (s.date === todayStr && s.start_time > (todayShift?.end_time || timeStr)) ||
    (s.date > todayStr)
  );


  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getMonth() + 1}月${d.getDate()}日 (${days[d.getDay()]})`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 pb-20 relative">
      {/* 画面ヘッダー */}
      <div className="bg-white px-6 pt-12 pb-6 rounded-b-3xl shadow-sm text-center z-10 relative">
        <p className="text-gray-500 text-xs font-medium mb-1">今日もお疲れ様です</p>
        <h1 className="text-2xl font-bold text-gray-800">{user?.display_name || 'ゲスト'} <span className="text-sm font-normal text-gray-400">さん</span></h1>
        {/* 管理者ボタン */}
        {user && (() => {
          const r = (user.role || '').toUpperCase();
          const isAdmin = SUPER_IDS.includes(user.id) || ['ADMIN', 'PRESIDENT', 'EXECUTIVE', 'MANAGER'].includes(r);
          return isAdmin ? (
            <div className="absolute right-4 top-12 flex flex-col items-end gap-2">
              <Link href="/admin/dashboard" className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg hover:bg-emerald-600 transition-all">
                管理画面へ
              </Link>
              {isSuperAdmin && (
                <button
                  onClick={() => setIsDebugMode(!isDebugMode)}
                  className={`text-[9px] font-bold px-2 py-1 rounded-md border transition-all ${isDebugMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                >
                  位置デバッグ: {isDebugMode ? 'ON' : 'OFF'}
                </button>
              )}
            </div>
          ) : null;
        })()}
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 px-5 mt-6 overflow-y-auto z-0">
        {/* シフト予定エリア */}
        <div className="space-y-3 mb-8">
          {todayShift ? (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 flex items-center justify-between transform transition-all hover:scale-[1.02] relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
              <div className="pl-2">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-emerald-500 text-[10px] font-black tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full">TODAY</p>
                  <p className="text-gray-800 font-bold text-sm">{formatDate(todayShift.date)}</p>
                </div>
                <p className="text-gray-800 font-bold text-base">{todayShift.location}</p>
                <p className="text-gray-500 text-xs font-medium mt-0.5 flex items-center gap-1">
                  <CalendarClock size={12} /> {todayShift.start_time.substring(0, 5)} - {todayShift.end_time.substring(0, 5)}
                </p>
              </div>
              <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shrink-0">
                <MapPin size={20} />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-center py-6 text-gray-400 font-bold text-sm">
              本日の予定シフトはありません
            </div>
          )}

          {nextShift && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between transform transition-all hover:scale-[1.02]">
              <div className="pl-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-gray-400 text-[10px] font-black tracking-wider bg-gray-50 px-2 py-0.5 rounded-full">NEXT SHIFT</p>
                  <p className="text-gray-600 font-bold text-sm">{formatDate(nextShift.date)}</p>
                </div>
                <p className="text-gray-600 font-bold text-base">{nextShift.location}</p>
                <p className="text-gray-400 text-xs mt-0.5">{nextShift.start_time.substring(0, 5)} - {nextShift.end_time.substring(0, 5)}</p>
              </div>
            </div>
          )}
        </div>

        {/* --- 共演メンバーのメモ (共有事項・メモ) --- */}
        {coworkerShifts.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold text-gray-500 mb-3 ml-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              同じシフトのメンバーの共有事項・メモ
            </h3>
            <div className="space-y-2.5">
              {coworkerShifts.map((cs) => (
                <div key={cs.id} className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {cs.users?.display_name?.substring(0, 1) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-bold text-gray-800 text-sm">{cs.users?.display_name}</p>
                      <p className="text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded">
                        {cs.start_time?.substring(0, 5)} - {cs.end_time?.substring(0, 5)}
                      </p>
                    </div>
                    {cs.daily_memo ? (
                      <p className="text-xs text-gray-600 leading-relaxed bg-gray-50/50 p-2 rounded-lg border border-gray-50">
                        {cs.daily_memo}
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">メモはありません</p>
                    )}
                    {(cs.planned_wake_up_time || cs.planned_leave_time) && (
                      <div className="flex gap-3 mt-2 text-[10px] items-center text-gray-500 font-medium">
                        {cs.planned_wake_up_time && (
                          <span className="flex items-center gap-1"><Sun size={10} className="text-amber-500" /> 起床 {cs.planned_wake_up_time.substring(0, 5)}</span>
                        )}
                        {cs.planned_leave_time && (
                          <span className="flex items-center gap-1"><Navigation size={10} className="text-blue-500" /> 出発 {cs.planned_leave_time.substring(0, 5)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4つのアクションボタン (起床/出発/出勤/退勤) */}
        <div className="grid grid-cols-2 gap-4 my-8 max-w-sm mx-auto">
          {/* 起床 */}
          <button
            onClick={() => handlePunch('WAKE_UP')}
            disabled={actionLoading}
            className={`
              relative w-full aspect-square rounded-3xl flex flex-col items-center justify-center
              shadow-lg transition-all duration-300 transform active:scale-95 disabled:opacity-70
              ${lastAction === 'WAKE_UP' ? 'ring-4 ring-amber-200 bg-amber-50' : 'bg-white hover:bg-gray-50 border border-gray-100'}
            `}
          >
            <div className={`p-4 rounded-full mb-3 ${lastAction === 'WAKE_UP' ? 'bg-amber-100 text-amber-500' : 'bg-gray-100 text-gray-400'}`}>
              <Sun fill={lastAction === 'WAKE_UP' ? 'currentColor' : 'none'} size={28} />
            </div>
            <span className={`text-xl font-black tracking-wider ${lastAction === 'WAKE_UP' ? 'text-amber-600' : 'text-gray-600'}`}>
              起 床
            </span>
          </button>

          {/* 出発 */}
          <button
            onClick={() => handlePunch('LEAVE')}
            disabled={actionLoading}
            className={`
              relative w-full aspect-square rounded-3xl flex flex-col items-center justify-center
              shadow-lg transition-all duration-300 transform active:scale-95 disabled:opacity-70
              ${lastAction === 'LEAVE' ? 'ring-4 ring-blue-200 bg-blue-50' : 'bg-white hover:bg-gray-50 border border-gray-100'}
            `}
          >
            <div className={`p-4 rounded-full mb-3 ${lastAction === 'LEAVE' ? 'bg-blue-100 text-blue-500' : 'bg-gray-100 text-gray-400'}`}>
              <Navigation fill={lastAction === 'LEAVE' ? 'currentColor' : 'none'} size={28} />
            </div>
            <span className={`text-xl font-black tracking-wider ${lastAction === 'LEAVE' ? 'text-blue-600' : 'text-gray-600'}`}>
              出 発
            </span>
          </button>

          {/* 出勤 */}
          <button
            onClick={() => handlePunch('CLOCK_IN')}
            disabled={actionLoading}
            className={`
              relative w-full aspect-square rounded-3xl flex flex-col items-center justify-center
              shadow-lg transition-all duration-300 transform active:scale-95 disabled:opacity-70
              ${lastAction === 'CLOCK_IN' ? 'ring-4 ring-emerald-200 bg-emerald-50' : 'bg-white hover:bg-gray-50 border border-gray-100'}
            `}
          >
            <div className={`p-4 rounded-full mb-3 ${lastAction === 'CLOCK_IN' ? 'bg-emerald-100 text-emerald-500' : 'bg-gray-100 text-gray-400'}`}>
              <Play fill={lastAction === 'CLOCK_IN' ? 'currentColor' : 'none'} className="ml-1" size={28} />
            </div>
            <span className={`text-xl font-black tracking-wider ${lastAction === 'CLOCK_IN' ? 'text-emerald-600' : 'text-gray-600'}`}>
              出 勤
            </span>
          </button>

          {/* 退勤 */}
          <button
            onClick={() => handlePunch('CLOCK_OUT')}
            disabled={actionLoading}
            className={`
              relative w-full aspect-square rounded-3xl flex flex-col items-center justify-center
              shadow-lg transition-all duration-300 transform active:scale-95 disabled:opacity-70
              ${lastAction === 'CLOCK_OUT' ? 'ring-4 ring-rose-200 bg-rose-50' : 'bg-white hover:bg-gray-50 border border-gray-100'}
            `}
          >
            <div className={`p-4 rounded-full mb-3 ${lastAction === 'CLOCK_OUT' ? 'bg-rose-100 text-rose-500' : 'bg-gray-100 text-gray-400'}`}>
              <Square fill={lastAction === 'CLOCK_OUT' ? 'currentColor' : 'none'} size={28} />
            </div>
            <span className={`text-xl font-black tracking-wider ${lastAction === 'CLOCK_OUT' ? 'text-rose-600' : 'text-gray-600'}`}>
              退 勤
            </span>
          </button>
        </div>

        {/* ステータスインジケーター */}
        <div className="flex items-center justify-center space-x-2 text-sm bg-white/60 py-2 px-4 rounded-full w-fit mx-auto border border-gray-100">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${lastAction && lastAction !== 'CLOCK_OUT' ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${lastAction && lastAction !== 'CLOCK_OUT' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
          </span>
          <span className="text-gray-700 font-bold">
            {lastAction === 'WAKE_UP' ? '起床済み / 出発待ち' :
              lastAction === 'LEAVE' ? '移動中' :
                lastAction === 'CLOCK_IN' ? `勤務中${todayShift ? ` (${todayShift.location})` : ''}` :
                  lastAction === 'CLOCK_OUT' ? '退勤済み' : '業務外 (未稼働)'}
          </span>
        </div>

        {/* 本日の記録履歴 */}
        <div className="mt-10 mb-8">
          <div className="flex items-center justify-center space-x-2 text-gray-400 text-xs mb-4">
            <div className="h-px w-8 bg-gray-200"></div>
            <span>本日の打刻履歴</span>
            <div className="h-px w-8 bg-gray-200"></div>
          </div>

          {todayAttendances.length === 0 ? (
            <p className="text-center text-gray-400 text-sm font-bold mt-6">まだ本日の打刻はありません</p>
          ) : (
            <div className="space-y-3">
              {todayAttendances.map((record, index) => {
                const dateObj = new Date(record.timestamp || new Date());
                const timeStr = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
                const getRecordDetails = (type: AttendanceType) => {
                  switch (type) {
                    case 'WAKE_UP': return { label: '起床', icon: <Sun size={16} className="flex-shrink-0" />, colorClass: 'bg-amber-500 shadow-amber-200' };
                    case 'LEAVE': return { label: '出発', icon: <Navigation size={16} className="flex-shrink-0" />, colorClass: 'bg-blue-500 shadow-blue-200' };
                    case 'CLOCK_IN': return { label: '出勤', icon: <Play size={16} className="ml-0.5 flex-shrink-0" />, colorClass: 'bg-emerald-500 shadow-emerald-200' };
                    case 'CLOCK_OUT': return { label: '退勤', icon: <Square size={16} className="flex-shrink-0" />, colorClass: 'bg-rose-500 shadow-rose-200' };
                  }
                };
                const details = getRecordDetails(record.type);

                return (
                  <div key={record.id || index} className="animate-in fade-in slide-in-from-bottom-2 bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm ${details.colorClass}`}>
                        {details.icon}
                      </div>
                      <span className="font-bold text-gray-700">{details.label}</span>
                    </div>
                    <span className="font-bold text-gray-800 tracking-wider text-lg">{timeStr}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- カスタム確認モーダル --- */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">確認</h3>
              <p className="text-sm text-gray-600 mt-2 font-medium">{pendingConfirm.message}</p>
            </div>
            <div className="p-4 flex gap-3 bg-white">
              <button
                onClick={() => setPendingConfirm(null)}
                className="flex-1 py-3.5 bg-gray-100 text-gray-500 font-bold rounded-xl active:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  pendingConfirm.action();
                  setPendingConfirm(null);
                }}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl active:bg-emerald-700 transition-all shadow-md shadow-emerald-200"
              >
                実行する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 翌日プランニングモーダル */}
      {planningShift && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative pb-4 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 text-center shrink-0">
              <h3 className="font-bold text-lg text-gray-800">翌日のプランニング</h3>
              <p className="text-sm text-gray-500 mt-1.5 font-medium leading-relaxed">今日も一日お疲れ様でした！<br />次回の予定を申告して遅刻を防ぎましょう。</p>
            </div>

            <div className="p-5 space-y-4 bg-gray-50/50 overflow-y-auto">
              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center">
                <p className="text-[10px] text-emerald-500 font-bold tracking-wider mb-0.5">NEXT SHIFT</p>
                <p className="text-gray-800 font-bold text-sm">{formatDate(planningShift.date)}</p>
                <p className="text-gray-600 font-medium text-xs mt-1">{planningShift.location} ({planningShift.start_time?.slice(0, 5)} - {planningShift.end_time?.slice(0, 5)})</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1.5 ml-1">起床予定時間 <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    value={plannedWakeUp}
                    onChange={e => setPlannedWakeUp(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white shadow-inner font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-base"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1.5 ml-1">出発予定時間 <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    value={plannedLeave}
                    onChange={e => setPlannedLeave(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white shadow-inner font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-base"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1.5 ml-1">メモ（共有事項など）</label>
                  <textarea
                    value={dailyMemo}
                    onChange={e => setDailyMemo(e.target.value)}
                    rows={2}
                    className="w-full p-3 border border-gray-200 rounded-xl bg-white shadow-inner text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
                    placeholder="共有事項・メモ（連絡事項など）"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 pt-3 pb-4 flex gap-3 bg-white shrink-0">
              <button
                onClick={() => setPlanningShift(null)}
                disabled={isSavingPlan}
                className="flex-1 py-3 bg-gray-100 text-gray-500 text-sm font-bold rounded-xl active:bg-gray-200 transition-colors"
              >
                あとで
              </button>
              <button
                onClick={async () => {
                  if (!plannedWakeUp || !plannedLeave) {
                    alert("起床予定時間と出発予定時間を入力してください");
                    return;
                  }
                  setIsSavingPlan(true);
                  
                  // 新規作成か既存更新か
                  let res;
                  if (planningShift.id) {
                    res = await updateShiftPlanning(planningShift.id, {
                      planned_wake_up_time: plannedWakeUp,
                      planned_leave_time: plannedLeave,
                      daily_memo: dailyMemo
                    });
                  } else {
                    // 明日の新規シフトとして登録
                    const { createShift } = await import('@/lib/api/admin');
                    res = await createShift({
                      user_id: user?.id || '', 
                      date: planningShift.date,
                      location: prompt('勤務先を入力してください') || '勤務先',
                      start_time: '09:00:00',
                      end_time: '18:00:00',
                      planned_wake_up_time: plannedWakeUp,
                      planned_leave_time: plannedLeave,
                      daily_memo: dailyMemo,
                      shift_type: 'work'
                    });
                  }
                  
                  setIsSavingPlan(false);
                  if (res.success) {
                    setPlanningShift(null);
                    // 必要に応じて画面を更新
                    window.location.reload();
                  } else {
                    alert('保存に失敗しました。');
                  }
                }}
                disabled={isSavingPlan}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl active:bg-emerald-700 transition-all shadow-md shadow-emerald-200 disabled:opacity-70 flex items-center justify-center"
              >
                {isSavingPlan ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 位置情報デバッグ用モーダル */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-gray-100 text-center">
              <h3 className="font-bold text-lg text-gray-800">打刻位置のデバッグ設定</h3>
              <p className="text-xs text-gray-500 mt-1">テスト用に位置情報を手動設定します</p>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-2 ml-1">直接入力 (緯度, 経度)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="緯度"
                    className="flex-1 p-2 border border-gray-200 rounded-lg text-sm"
                    value={debugLocation?.lat || ''}
                    onChange={e => setDebugLocation(prev => ({ lat: parseFloat(e.target.value), lng: prev?.lng || 0 }))}
                  />
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="経度"
                    className="flex-1 p-2 border border-gray-200 rounded-lg text-sm"
                    value={debugLocation?.lng || ''}
                    onChange={e => setDebugLocation(prev => ({ lat: prev?.lat || 0, lng: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-x-0 top-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-400 font-bold">または店舗から選択</span>
                </div>
              </div>

              <div className="space-y-2">
                {stores.map(store => (
                  <button
                    key={store.id}
                    onClick={() => {
                      setDebugLocation({ lat: store.latitude, lng: store.longitude });
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs ${
                      debugLocation?.lat === store.latitude && debugLocation?.lng === store.longitude
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500'
                        : 'bg-gray-50 border-gray-100 text-gray-600'
                    }`}
                  >
                    <p className="font-bold">{store.name}</p>
                    <p className="text-[10px] opacity-60">Lat: {store.latitude}, Lng: {store.longitude}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 flex gap-3 border-t border-gray-100">
              <button
                onClick={() => {
                  setIsLocationModalOpen(false);
                  setIsDebugMode(false);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-200"
              >
                この位置で打刻
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フローティングボトムナビゲーション */}
      <div className="fixed bottom-0 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 pt-3 pb-8 flex justify-around items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50">
        <Link href="/" className="flex flex-col items-center text-emerald-600 transition-transform active:scale-95">
          <Home size={24} strokeWidth={2.5} />
          <span className="text-[10px] mt-1.5 font-bold">ホーム</span>
        </Link>
        <Link href="/shift" className="flex flex-col items-center text-gray-400 hover:text-emerald-500 transition-all active:scale-95">
          <CalendarClock size={24} strokeWidth={2} />
          <span className="text-[10px] mt-1.5 font-semibold">シフト</span>
        </Link>
        <Link href="/expense" className="flex flex-col items-center text-gray-400 hover:text-emerald-500 transition-all active:scale-95">
          <Receipt size={24} strokeWidth={2} />
          <span className="text-[10px] mt-1.5 font-semibold">交通費</span>
        </Link>
      </div>
    </div>
  );
}
