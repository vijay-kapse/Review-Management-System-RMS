# 使用官方 Python 镜像作为基础
FROM python:3.12.7-slim

#
# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    libpq-dev gcc && \
    apt-get clean

# 安装 Python 依赖
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# 复制 Django 项目文件到容器中
COPY . /app/

# 设置环境变量（生产时可调试为 False）
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
#adding entrypoint.sh to run python manage.py migrate
#handle waiting time to make sure db started
COPY entrypoint.sh /scripts/entrypoint.sh
COPY wait-for-it.sh /scripts/wait-for-it.sh
RUN chmod +x /scripts/entrypoint.sh
RUN chmod +x /scripts/wait-for-it.sh
#container 启动时候执行entrypoint.sh
ENTRYPOINT ["/scripts/entrypoint.sh"]

# ⚠️ 一定要放在复制完代码之后
RUN python manage.py collectstatic --noinput

# 如果需要，给静态文件目录设置权限（可选）
RUN mkdir -p /app/staticfiles && chown -R www-data:www-data /app/staticfiles
#handle static files such as js
#RUN mkdir -p /path/to/static && chown -R www-data:www-data /path/to/static

# 打开容器所需的端口
EXPOSE 8000

# 启动应用程序
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "survey_group8.wsgi:application"]
