cmake_minimum_required(VERSION 3.19)
project(qhtml7-wasm LANGUAGES CXX)

find_package(Qt6 6.5 REQUIRED COMPONENTS Core)

qt_standard_project_setup()

qt_add_executable(qhtml7-wasm
    main.cpp
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
