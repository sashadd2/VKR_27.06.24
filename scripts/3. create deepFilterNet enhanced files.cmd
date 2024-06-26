@echo off
for %%i in (default/*) do (
  deepFilter -m DeepFilterNet "default/%%i" --output-dir "deepFilterNet1"
)
for %%i in (normalized/*) do (
  deepFilter -m DeepFilterNet "normalized/%%i" --output-dir "deepFilterNet1_normalized"
)
  
for %%i in (default/*) do (
  deepFilter -m DeepFilterNet2 "default/%%i" --output-dir "deepFilterNet2"
)
for %%i in (normalized/*) do (
  deepFilter -m DeepFilterNet2 "normalized/%%i" --output-dir "deepFilterNet2_normalized"
)
  
for %%i in (default/*) do (
  deepFilter -m DeepFilterNet3 "default/%%i" --output-dir "deepFilterNet3"
)
for %%i in (normalized/*) do (
  deepFilter -m DeepFilterNet3 "normalized/%%i" --output-dir "deepFilterNet3_normalized"
)