@echo off
for %%i in (default/*) do (
  ffmpeg -i "default/%%i" -ac 1 -ar 16000 -filter:a loudnorm "normalized/%%~ni.wav"
)