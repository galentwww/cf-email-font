"use client"

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Mail, User, Eye, Copy, RotateCw, Clock, LogOut } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';

interface VerificationCode {
  code: string;
  type?: 'link' | 'code';
  sender_name: string;
  sender_email: string;
  received_time: string;
  key: string;
}

interface CodeDetailDialogProps {
  code: VerificationCode | null;
  isOpen: boolean;
  onClose: () => void;
}

const UsageGuidelines = () => {
  return (
    <div className="space-y-4 text-sm text-gray-600">
      <h3 className="font-medium text-base text-gray-900">使用说明</h3>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          本服务仅用于接收验证码邮件，这是一个公开邮箱系统。请勿发送任何私密或敏感信息，以免信息泄露。
        </li>
        <li>
          系统仅识别并显示包含验证码的邮件。其他类型的邮件将被自动过滤，不会在列表中显示。
        </li>
        <li>
          页面显示的过期时间仅表示验证码在本系统中的缓存时间，与验证码在原服务中的有效期无关，请以原服务提供的有效期为准。
        </li>
        <li>
          如未看到预期的验证码，请稍候片刻后使用刷新按钮更新列表。邮件传输可能存在短暂延迟。
        </li>
        <li>
          系统支持 CATCH-ALL 功能，任何发送至 *@ttttt.tech 的邮件都将被转发至此系统（其中 * 代表任意前缀）。
        </li>
        <li>
          请合理使用本服务。频繁或过度使用可能导致服务质量下降，影响其他用户的使用体验。
        </li>
      </ul>
    </div>
  );
};

const KeyHighlights = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex items-start space-x-3">
        <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
        <div>
          <p className="font-medium text-sm">临时邮箱地址</p>
          <p className="text-sm text-gray-600">任意前缀@ttttt.tech</p>
        </div>
      </div>
      <div className="flex items-start space-x-3">
        <Clock className="h-5 w-5 text-orange-500 mt-0.5" />
        <div>
          <p className="font-medium text-sm">验证码有效期</p>
          <p className="text-sm text-gray-600">系统缓存 60 分钟，实际有效期以原服务为准</p>
        </div>
      </div>
    </div>
  );
};

const VerificationList = () => {
  const [selectedCode, setSelectedCode] = useState<VerificationCode | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [codes, setCodes] = useState<VerificationCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const { data: session, status } = useSession();
  const router = useRouter();

  const fetchCodes = async () => {
    try {
      const apiEndpoint = process.env.NEXT_PUBLIC_API_ENDPOINT
      const response = await fetch(`${apiEndpoint}/codes`);
      const data = await response.json();
      setCodes(data);
      setLastRefreshTime(new Date());
      toast.success('刷新成功');
    } catch (error) {
      console.error('Error fetching codes:', error);
      toast.error('刷新失败');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCodes();
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('验证码已复制到剪贴板');
    } catch (err) {
      toast.error('复制失败，请手动复制');
    }
  };

  const parseDateTime = (timeStr: string): Date => {
    // Expected format: "2025/1/21 13:12:56"
    const [datePart, timePart] = timeStr.split(' ');
    const [year, month, day] = datePart.split('/').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
  };

  const formatTime = (timeStr: string): string => {
    const date = parseDateTime(timeStr);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getExpiryTime = (timeStr: string): string => {
    const date = parseDateTime(timeStr);
    const expiryDate = new Date(date.getTime() + 60 * 60 * 1000); // 60 minutes later
    return expiryDate.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const CodeDetailDialog: React.FC<CodeDetailDialogProps> = ({ code, isOpen, onClose }) => {
    if (!code) return null;

    const handleLinkClick = (url: string) => {
      window.open(url, '_blank');
    };

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>验证码详情</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="text-center">
              {code.type === 'link' ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 break-all bg-gray-50 p-4 rounded-lg">
                    {code.code}
                  </div>
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full"
                    onClick={() => handleLinkClick(code.code)}
                  >
                    打开链接
                  </Button>
                </div>
              ) : (
                <div className="text-5xl font-mono tracking-widest bg-gray-50 py-8 rounded-lg">
                  {code.code}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => handleCopy(code.code)}
              >
                <Copy className="h-4 w-4 mr-2" />
                复制{code.type === 'link' ? '链接' : '验证码'}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>发送者：{code.sender_name}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span>邮箱：{code.sender_email}</span>
              </div>
              <div className="text-sm text-gray-600">
                接收时间：{formatTime(code.received_time)}
              </div>
              <div className="text-sm text-gray-600">
                过期时间：{getExpiryTime(code.received_time)}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <Card className="shadow-lg">
          <CardContent className="p-8 text-center text-gray-500">
            加载中...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Toaster richColors />
      
      <div className="space-y-3">
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-medium">验证码列表</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="h-8 w-8"
                  >
                    <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                  {session?.user && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => signOut()}
                      className="h-8"
                    >
                      退出
                    </Button>
                  )}
                </div>
              </div>
              {session?.user && (
                <div className="flex items-center gap-2">
                  {session.user.image && (
                    <Image
                      src={session.user.image}
                      alt="User Avatar"
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  )}
                  <div className="text-sm text-gray-600">
                    <span>{session.user.name || '用户'}</span>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="py-3">
            <KeyHighlights />
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="py-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">验证码</TableHead>
                  <TableHead className="hidden md:table-cell">发送者</TableHead>
                  <TableHead className="hidden md:table-cell">邮箱</TableHead>
                  <TableHead className="w-20">接收</TableHead>
                  <TableHead className="hidden md:table-cell w-20">过期</TableHead>
                  <TableHead className="w-20 md:w-16">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Mail className="h-5 w-5" />
                        <span>暂无验证码</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  codes.map((code) => (
                    <TableRow key={code.key}>
                      <TableCell className="font-mono">
                        <div className="flex items-center gap-1">
                          {code.type === 'link' ? (
                            <Badge variant="secondary">链接</Badge>
                          ) : (
                            <span>{code.code}</span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hidden md:flex"
                            onClick={() => handleCopy(code.code)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="block truncate" title={code.sender_name}>
                          {code.sender_name}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="block truncate" title={code.sender_email}>
                          {code.sender_email}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatTime(code.received_time)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell whitespace-nowrap">
                        {getExpiryTime(code.received_time)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 md:hidden"
                            onClick={() => handleCopy(code.code)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setSelectedCode(code);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="py-4">
            <UsageGuidelines />
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-400 mt-2">
          上次更新时间：{lastRefreshTime.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })}
        </div>
      </div>

      <CodeDetailDialog
        code={selectedCode}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedCode(null);
        }}
      />
    </div>
  );
};

export default VerificationList;