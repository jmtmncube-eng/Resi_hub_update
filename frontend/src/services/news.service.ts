import api from './api';
import { ApiResponse } from '../types/api.types';
import { NewsItem } from '../types/domain.types';

export async function getNews(type?: string): Promise<NewsItem[]> {
  const res = await api.get<ApiResponse<NewsItem[]>>('/news', { params: type ? { type } : {} });
  return res.data.data;
}

export async function getNewsItem(id: string): Promise<NewsItem> {
  const res = await api.get<ApiResponse<NewsItem>>(`/news/${id}`);
  return res.data.data;
}

export async function createNews(data: {
  title: string; body: string; type: string;
  tag: string; tagColor: string; date: string; pinned: boolean;
}): Promise<NewsItem> {
  const res = await api.post<ApiResponse<NewsItem>>('/news', data);
  return res.data.data;
}

export async function togglePin(id: string): Promise<NewsItem> {
  const res = await api.patch<ApiResponse<NewsItem>>(`/news/${id}/pin`);
  return res.data.data;
}

export async function deleteNews(id: string): Promise<void> {
  await api.delete(`/news/${id}`);
}
