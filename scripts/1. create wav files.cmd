@echo off
for %%i in (audio/*) do (
  ffmpeg -i "audio/%%i" -ac 1 -ar 16000 "default/%%~ni.wav"
)