<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

/**
 * What a post says on a channel that only its platform knows, tagged by `platform`. Platforms without options take none.
 */
class TargetOptions extends JsonSerializableType
{
    /**
     * @var (
     *    'youtube'
     *   |'tiktok'
     *   |'pinterest'
     *   |'googleBusiness'
     *   |'linkedin'
     *   |'_unknown'
     * ) $platform
     */
    public readonly string $platform;

    /**
     * @var (
     *    YouTubeOptions
     *   |TikTokOptions
     *   |PinterestOptions
     *   |GoogleBusinessOptions
     *   |LinkedInOptions
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   platform: (
     *    'youtube'
     *   |'tiktok'
     *   |'pinterest'
     *   |'googleBusiness'
     *   |'linkedin'
     *   |'_unknown'
     * ),
     *   value: (
     *    YouTubeOptions
     *   |TikTokOptions
     *   |PinterestOptions
     *   |GoogleBusinessOptions
     *   |LinkedInOptions
     *   |mixed
     * ),
     * } $values
     */
    private function __construct(
        array $values,
    ) {
        $this->platform = $values['platform'];
        $this->value = $values['value'];
    }

    /**
     * @param YouTubeOptions $youtube
     * @return TargetOptions
     */
    public static function youtube(YouTubeOptions $youtube): TargetOptions
    {
        return new TargetOptions([
            'platform' => 'youtube',
            'value' => $youtube,
        ]);
    }

    /**
     * @param TikTokOptions $tiktok
     * @return TargetOptions
     */
    public static function tiktok(TikTokOptions $tiktok): TargetOptions
    {
        return new TargetOptions([
            'platform' => 'tiktok',
            'value' => $tiktok,
        ]);
    }

    /**
     * @param PinterestOptions $pinterest
     * @return TargetOptions
     */
    public static function pinterest(PinterestOptions $pinterest): TargetOptions
    {
        return new TargetOptions([
            'platform' => 'pinterest',
            'value' => $pinterest,
        ]);
    }

    /**
     * @param GoogleBusinessOptions $googleBusiness
     * @return TargetOptions
     */
    public static function googleBusiness(GoogleBusinessOptions $googleBusiness): TargetOptions
    {
        return new TargetOptions([
            'platform' => 'googleBusiness',
            'value' => $googleBusiness,
        ]);
    }

    /**
     * @param LinkedInOptions $linkedin
     * @return TargetOptions
     */
    public static function linkedin(LinkedInOptions $linkedin): TargetOptions
    {
        return new TargetOptions([
            'platform' => 'linkedin',
            'value' => $linkedin,
        ]);
    }

    /**
     * @return bool
     */
    public function isYoutube(): bool
    {
        return $this->value instanceof YouTubeOptions && $this->platform === 'youtube';
    }

    /**
     * @return YouTubeOptions
     */
    public function asYoutube(): YouTubeOptions
    {
        if (!($this->value instanceof YouTubeOptions && $this->platform === 'youtube')) {
            throw new Exception(
                "Expected youtube; got " . $this->platform . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTiktok(): bool
    {
        return $this->value instanceof TikTokOptions && $this->platform === 'tiktok';
    }

    /**
     * @return TikTokOptions
     */
    public function asTiktok(): TikTokOptions
    {
        if (!($this->value instanceof TikTokOptions && $this->platform === 'tiktok')) {
            throw new Exception(
                "Expected tiktok; got " . $this->platform . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPinterest(): bool
    {
        return $this->value instanceof PinterestOptions && $this->platform === 'pinterest';
    }

    /**
     * @return PinterestOptions
     */
    public function asPinterest(): PinterestOptions
    {
        if (!($this->value instanceof PinterestOptions && $this->platform === 'pinterest')) {
            throw new Exception(
                "Expected pinterest; got " . $this->platform . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isGoogleBusiness(): bool
    {
        return $this->value instanceof GoogleBusinessOptions && $this->platform === 'googleBusiness';
    }

    /**
     * @return GoogleBusinessOptions
     */
    public function asGoogleBusiness(): GoogleBusinessOptions
    {
        if (!($this->value instanceof GoogleBusinessOptions && $this->platform === 'googleBusiness')) {
            throw new Exception(
                "Expected googleBusiness; got " . $this->platform . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isLinkedin(): bool
    {
        return $this->value instanceof LinkedInOptions && $this->platform === 'linkedin';
    }

    /**
     * @return LinkedInOptions
     */
    public function asLinkedin(): LinkedInOptions
    {
        if (!($this->value instanceof LinkedInOptions && $this->platform === 'linkedin')) {
            throw new Exception(
                "Expected linkedin; got " . $this->platform . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }

    /**
     * @return array<mixed>
     */
    public function jsonSerialize(): array
    {
        $result = [];
        $result['platform'] = $this->platform;

        $base = parent::jsonSerialize();
        $result = array_merge($base, $result);

        switch ($this->platform) {
            case 'youtube':
                $value = $this->asYoutube()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'tiktok':
                $value = $this->asTiktok()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'pinterest':
                $value = $this->asPinterest()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'googleBusiness':
                $value = $this->asGoogleBusiness()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'linkedin':
                $value = $this->asLinkedin()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case '_unknown':
            default:
                if (is_null($this->value)) {
                    break;
                }
                if ($this->value instanceof JsonSerializableType) {
                    $value = $this->value->jsonSerialize();
                    $result = array_merge($value, $result);
                } elseif (is_array($this->value)) {
                    $result = array_merge($this->value, $result);
                }
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function jsonDeserialize(array $data): static
    {
        $args = [];
        if (!array_key_exists('platform', $data)) {
            throw new Exception(
                "JSON data is missing property 'platform'",
            );
        }
        $platform = $data['platform'];
        if (!(is_string($platform))) {
            throw new Exception(
                "Expected property 'platform' in JSON data to be string, instead received " . get_debug_type($data['platform']),
            );
        }

        $args['platform'] = $platform;
        switch ($platform) {
            case 'youtube':
                $args['value'] = YouTubeOptions::jsonDeserialize($data);
                break;
            case 'tiktok':
                $args['value'] = TikTokOptions::jsonDeserialize($data);
                break;
            case 'pinterest':
                $args['value'] = PinterestOptions::jsonDeserialize($data);
                break;
            case 'googleBusiness':
                $args['value'] = GoogleBusinessOptions::jsonDeserialize($data);
                break;
            case 'linkedin':
                $args['value'] = LinkedInOptions::jsonDeserialize($data);
                break;
            case '_unknown':
            default:
                $args['platform'] = '_unknown';
                $args['value'] = $data;
        }

        // @phpstan-ignore-next-line
        return new static($args);
    }
}
