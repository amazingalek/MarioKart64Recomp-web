// The settings: RecompFrontend's General, Controls, Graphics, Sound and Mods tabs, with its default bindings, and the
// three volumes the game's patches read on the Sound tab, as upstream's own menu had them: music, effects and
// ambience. The game's own music setting (its sound mode menu) moves the music volume (patches/audio.c).

#include <filesystem>
#include <string>
#include <variant>

#include "recompui/config.h"
#include "util/file.h"
#include "mk64.h"

namespace mk64::configkeys::sound {
    inline const std::string bgm_volume = "bgm_volume";
    inline const std::string sfx_volume = "sfx_volume";
    inline const std::string env_volume = "env_volume";
}

static int get_sound_volume(const std::string& option_id) {
    return static_cast<int>(std::get<double>(recompui::config::get_sound_config().get_option_value(option_id)));
}

int mk64::get_bgm_volume() {
    return get_sound_volume(mk64::configkeys::sound::bgm_volume);
}

void mk64::set_bgm_volume(int volume) {
    recompui::config::get_sound_config().set_option_value(mk64::configkeys::sound::bgm_volume, static_cast<double>(volume));
}

int mk64::get_sfx_volume() {
    return get_sound_volume(mk64::configkeys::sound::sfx_volume);
}

int mk64::get_env_volume() {
    return get_sound_volume(mk64::configkeys::sound::env_volume);
}

void mk64::init_config() {
    std::filesystem::path app_dir = recompui::file::get_app_folder_path();
    if (!app_dir.empty()) {
        std::filesystem::create_directories(app_dir);
    }

    recompui::config::GeneralTabOptions general_options{};
    general_options.has_rumble_strength = true;
    general_options.has_gyro_sensitivity = true;
    general_options.has_mouse_sensitivity = true;
    recompui::config::create_general_tab(general_options);
    recompui::config::create_controls_tab();
    recompui::config::create_graphics_tab();

    recomp::config::Config& sound_config = recompui::config::create_sound_tab();
    sound_config.add_percent_number_option(
        mk64::configkeys::sound::bgm_volume,
        "Background Music Volume",
        "Controls the volume of the background music.",
        100.0f
    );
    sound_config.add_percent_number_option(
        mk64::configkeys::sound::sfx_volume,
        "Sound Effects Volume",
        "Controls the volume of the sound effects.",
        100.0f
    );
    sound_config.add_percent_number_option(
        mk64::configkeys::sound::env_volume,
        "Ambience Volume",
        "Controls the volume of the ambient sounds.",
        100.0f
    );

    recompui::config::create_mods_tab();
    recompui::config::finalize();
}
