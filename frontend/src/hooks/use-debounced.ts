// 防抖 Hook：延迟更新值，避免每个按键触发请求
//
// 典型场景：搜索框输入，每个字符都触发 useQuery 会导致大量请求
// 使用 const debounced = useDebounced(search, 400); 让 queryKey 使用 debounced

import { useState, useEffect } from 'react';

export function useDebounced<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
