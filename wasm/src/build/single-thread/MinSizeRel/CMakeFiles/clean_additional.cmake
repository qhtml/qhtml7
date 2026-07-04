# Additional clean files
cmake_minimum_required(VERSION 3.16)

if("${CONFIG}" STREQUAL "" OR "${CONFIG}" STREQUAL "MinSizeRel")
  file(REMOVE_RECURSE
  "CMakeFiles/qhtml7-wasm_autogen.dir/AutogenUsed.txt"
  "CMakeFiles/qhtml7-wasm_autogen.dir/ParseCache.txt"
  "qhtml7-wasm_autogen"
  )
endif()
