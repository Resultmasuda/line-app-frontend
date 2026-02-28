"use client";
import React, { useState, useEffect } from 'react';
import { Play, Square, MapPin, CalendarClock, Receipt, Settings, Home } from 'lucide-react';
import Link from 'next/link';
import { useLiff } from '@/components/LiffProvider';
import { getUpcomingShifts, ShiftRecord } from '@/lib/api/shift';
import { recordAttendance, getTodayAttendances, AttendanceType } from '@/lib/api/attendance';

export default function AppDashboard() {
  const { user, loading: liffLoading } = useLiff();

  const [isWorking, setIsWorking] = useState(false);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        // シフト取得 (今日以降2件)
        const shiftRes = await getUpcomingShifts(user.id, 2);
        if (shiftRes.success && shiftRes.data && isMounted) {
          setShifts(shiftRes.data);
        }

        // 今日の打刻状態を取得
        const todayStr = new Date().toISOString().split('T')[0];
        const attendRes = await getTodayAttendances(user.id, todayStr);
        if (attendRes.success && attendRes.data && attendRes.data.length > 0 && isMounted) {
          // 最後の打刻実績を確認
          const lastRecord = attendRes.data[attendRes.data.length - 1];
          // CLOCK_IN または WAKE_UP 等で業務中とみなす。今回はシンプルにCLOCK_INで判定
          if (lastRecord.type === 'CLOCK_IN') {
            setIsWorking(true);
          } else {
            setIsWorking(false);
          }
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

  const handlePunch = async () => {
    if (!user || actionLoading) return;

    setActionLoading(true);
    const nextWorkingState = !isWorking;
    // オプティミスティックにUIを更新
    setIsWorking(nextWorkingState);

    try {
      // 位置情報を取得
      const location = await getCurrentLocation();

      const todayStr = new Date().toISOString().split('T')[0];
      const type: AttendanceType = nextWorkingState ? 'CLOCK_IN' : 'CLOCK_OUT';

      const res = await recordAttendance({
        user_id: user.id,
        date: todayStr,
        type: type,
        latitude: location?.lat || null,
        longitude: location?.lng || null,
      });

      if (!res.success) {
        alert("打刻の保存に失敗しました。電波の良いところで再度お試しください。");
        setIsWorking(!nextWorkingState); // 失敗時は元に戻す
      }
    } catch (e) {
      alert("通信エラーが発生しました。");
      setIsWorking(!nextWorkingState);
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

  // シフトを TODAY と NEXT に分ける
  const todayStr = new Date().toISOString().split('T')[0];
  const todayShift = shifts.find(s => s.date === todayStr);
  const nextShift = shifts.find(s => s.date !== todayStr);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getMonth() + 1}月${d.getDate()}日 (${days[d.getDay()]})`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 pb-20 relative">
      {/* 画面ヘッダー */}
      <div className="bg-white px-6 pt-12 pb-6 rounded-b-3xl shadow-sm text-center z-10">
        <p className="text-gray-500 text-xs font-medium mb-1">今日もお疲れ様です</p>
        <h1 className="text-2xl font-bold text-gray-800">{user?.display_name || 'ゲスト'} <span className="text-sm font-normal text-gray-400">さん</span></h1>
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

        {/* 巨大なアクションボタン (出勤/退勤) */}
        <div className="flex justify-center my-10">
          <button
            onClick={handlePunch}
            disabled={actionLoading}
            className={`
              relative w-52 h-52 rounded-full flex flex-col items-center justify-center
              shadow-xl transition-all duration-300 transform active:scale-95 disabled:opacity-70
              ${isWorking
                ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-200'
                : 'bg-gradient-to-tl from-emerald-400 to-teal-500 shadow-emerald-200'}
            `}
          >
            {isWorking && (
              <span className="absolute w-full h-full rounded-full animate-ping bg-red-400 opacity-20"></span>
            )}

            <div className="bg-white/25 p-4 rounded-full mb-3 backdrop-blur-sm">
              {isWorking ? (
                <Square fill="currentColor" className="text-white" size={32} />
              ) : (
                <Play fill="currentColor" className="text-white ml-1" size={32} />
              )}
            </div>
            <span className="text-white text-3xl font-black tracking-widest drop-shadow-md">
              {isWorking ? '退 勤' : '出 勤'}
            </span>
            <span className="text-white/90 text-xs mt-2 font-medium">
              {isWorking ? 'タップして業務を終了' : 'タップして業務を開始'}
            </span>
          </button>
        </div>

        {/* ステータスインジケーター */}
        <div className="flex items-center justify-center space-x-2 text-sm bg-white/60 py-2 px-4 rounded-full w-fit mx-auto border border-gray-100">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isWorking ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isWorking ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
          </span>
          <span className="text-gray-700 font-bold">
            {isWorking ? `勤務中${todayShift ? ` (${todayShift.location})` : ''}` : '業務外 (未出勤)'}
          </span>
        </div>

        {/* 本日の記録履歴 */}
        <div className="mt-10 mb-4 text-center">
          <div className="inline-flex items-center justify-center space-x-2 text-gray-400 text-xs">
            <div className="h-px w-8 bg-gray-200"></div>
            <span>スワイプして過去の記録を確認</span>
            <div className="h-px w-8 bg-gray-200"></div>
          </div>
        </div>
      </div>

      {/* フローティングボトムナビゲーション */}
      <div className="fixed bottom-0 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 pt-3 pb-8 flex justify-between items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50">
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
        <button className="flex flex-col items-center text-gray-400 hover:text-emerald-500 transition-all active:scale-95">
          <Settings size={24} strokeWidth={2} />
          <span className="text-[10px] mt-1.5 font-semibold">設定</span>
        </button>
      </div>
    </div>
  );
}
