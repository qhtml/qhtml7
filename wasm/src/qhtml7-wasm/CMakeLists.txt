cmake_minimum_required(VERSION 3.19)
project(qhtml7-wasm LANGUAGES C CXX)

find_package(Qt6 6.5 REQUIRED COMPONENTS Core)

qt_standard_project_setup()

set(CMAKE_AUTORCC ON)

qt_add_executable(qhtml7-wasm
    main.cpp
    qhtml_types.hpp qhtml_parser.hpp
    ../../../lib/quickjs/cutils.c
    ../../../lib/quickjs/dtoa.c
    ../../../lib/quickjs/libregexp.c
    ../../../lib/quickjs/libunicode.c
    ../../../lib/quickjs/quickjs.c
    resources.qrc
)

target_include_directories(qhtml7-wasm
    PRIVATE
        ../../../lib/quickjs
)

target_compile_definitions(qhtml7-wasm
    PRIVATE
        _GNU_SOURCE
        CONFIG_VERSION="qhtml7"
        QHTML_QUICKJS_ENABLED=1
)

target_link_libraries(qhtml7-wasm
    PRIVATE
        Qt::Core
)

install(TARGETS qhtml7-wasm
    BUNDLE  DESTINATION .
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
)
