#ifndef __MK64_H__
#define __MK64_H__

#include <string_view>

namespace mk64 {
    inline constexpr std::u8string_view program_id = u8"MarioKart64Recompiled";
    inline constexpr std::string_view program_name = "Mario Kart 64: Recompiled";

    void register_overlays();
    void register_patches();

    // The settings (config.cpp): RecompFrontend's tabs, with the music, effects and ambience volumes on the Sound tab.
    void init_config();
    int get_bgm_volume();
    void set_bgm_volume(int volume);
    int get_sfx_volume();
    int get_env_volume();
}

#endif
