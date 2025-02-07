/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'res.galentwww.cn',
        },
        {
          protocol: 'http',
          hostname: 'haloassest-1254398565.cos.ap-beijing.myqcloud.com',
        },
        {
          protocol: 'https',
          hostname: 'haloassest-1254398565.cos.ap-beijing.myqcloud.com',
        },
        {
          protocol: 'https',
          hostname: 'galentwww-1257718180.file.myqcloud.com',
        },
        {
          protocol: 'https',
          hostname: 'wystatusbase-1254398565.cos.ap-beijing.myqcloud.com',
        }
      ],
    },
  }
  
  module.exports = nextConfig
  