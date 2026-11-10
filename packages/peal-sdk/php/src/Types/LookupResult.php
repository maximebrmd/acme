<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class LookupResult extends JsonSerializableType
{
    /**
     * @var (
     *    'youtubeVideoCategories'
     *   |'youtubePlaylists'
     *   |'tiktokCreator'
     *   |'linkedinOrganizations'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    LookupResultYoutubeVideoCategories
     *   |LookupResultYoutubePlaylists
     *   |LookupResultTiktokCreator
     *   |LookupResultLinkedinOrganizations
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'youtubeVideoCategories'
     *   |'youtubePlaylists'
     *   |'tiktokCreator'
     *   |'linkedinOrganizations'
     *   |'_unknown'
     * ),
     *   value: (
     *    LookupResultYoutubeVideoCategories
     *   |LookupResultYoutubePlaylists
     *   |LookupResultTiktokCreator
     *   |LookupResultLinkedinOrganizations
     *   |mixed
     * ),
     * } $values
     */
    private function __construct(
        array $values,
    ) {
        $this->type = $values['type'];
        $this->value = $values['value'];
    }

    /**
     * @param LookupResultYoutubeVideoCategories $youtubeVideoCategories
     * @return LookupResult
     */
    public static function youtubeVideoCategories(LookupResultYoutubeVideoCategories $youtubeVideoCategories): LookupResult
    {
        return new LookupResult([
            'type' => 'youtubeVideoCategories',
            'value' => $youtubeVideoCategories,
        ]);
    }

    /**
     * @param LookupResultYoutubePlaylists $youtubePlaylists
     * @return LookupResult
     */
    public static function youtubePlaylists(LookupResultYoutubePlaylists $youtubePlaylists): LookupResult
    {
        return new LookupResult([
            'type' => 'youtubePlaylists',
            'value' => $youtubePlaylists,
        ]);
    }

    /**
     * @param LookupResultTiktokCreator $tiktokCreator
     * @return LookupResult
     */
    public static function tiktokCreator(LookupResultTiktokCreator $tiktokCreator): LookupResult
    {
        return new LookupResult([
            'type' => 'tiktokCreator',
            'value' => $tiktokCreator,
        ]);
    }

    /**
     * @param LookupResultLinkedinOrganizations $linkedinOrganizations
     * @return LookupResult
     */
    public static function linkedinOrganizations(LookupResultLinkedinOrganizations $linkedinOrganizations): LookupResult
    {
        return new LookupResult([
            'type' => 'linkedinOrganizations',
            'value' => $linkedinOrganizations,
        ]);
    }

    /**
     * @return bool
     */
    public function isYoutubeVideoCategories(): bool
    {
        return $this->value instanceof LookupResultYoutubeVideoCategories && $this->type === 'youtubeVideoCategories';
    }

    /**
     * @return LookupResultYoutubeVideoCategories
     */
    public function asYoutubeVideoCategories(): LookupResultYoutubeVideoCategories
    {
        if (!($this->value instanceof LookupResultYoutubeVideoCategories && $this->type === 'youtubeVideoCategories')) {
            throw new Exception(
                "Expected youtubeVideoCategories; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isYoutubePlaylists(): bool
    {
        return $this->value instanceof LookupResultYoutubePlaylists && $this->type === 'youtubePlaylists';
    }

    /**
     * @return LookupResultYoutubePlaylists
     */
    public function asYoutubePlaylists(): LookupResultYoutubePlaylists
    {
        if (!($this->value instanceof LookupResultYoutubePlaylists && $this->type === 'youtubePlaylists')) {
            throw new Exception(
                "Expected youtubePlaylists; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTiktokCreator(): bool
    {
        return $this->value instanceof LookupResultTiktokCreator && $this->type === 'tiktokCreator';
    }

    /**
     * @return LookupResultTiktokCreator
     */
    public function asTiktokCreator(): LookupResultTiktokCreator
    {
        if (!($this->value instanceof LookupResultTiktokCreator && $this->type === 'tiktokCreator')) {
            throw new Exception(
                "Expected tiktokCreator; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isLinkedinOrganizations(): bool
    {
        return $this->value instanceof LookupResultLinkedinOrganizations && $this->type === 'linkedinOrganizations';
    }

    /**
     * @return LookupResultLinkedinOrganizations
     */
    public function asLinkedinOrganizations(): LookupResultLinkedinOrganizations
    {
        if (!($this->value instanceof LookupResultLinkedinOrganizations && $this->type === 'linkedinOrganizations')) {
            throw new Exception(
                "Expected linkedinOrganizations; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
        $result['_tag'] = $this->type;

        $base = parent::jsonSerialize();
        $result = array_merge($base, $result);

        switch ($this->type) {
            case 'youtubeVideoCategories':
                $value = $this->asYoutubeVideoCategories()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'youtubePlaylists':
                $value = $this->asYoutubePlaylists()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'tiktokCreator':
                $value = $this->asTiktokCreator()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'linkedinOrganizations':
                $value = $this->asLinkedinOrganizations()->jsonSerialize();
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
        if (!array_key_exists('_tag', $data)) {
            throw new Exception(
                "JSON data is missing property '_tag'",
            );
        }
        $type = $data['_tag'];
        if (!(is_string($type))) {
            throw new Exception(
                "Expected property 'type' in JSON data to be string, instead received " . get_debug_type($data['_tag']),
            );
        }

        $args['type'] = $type;
        switch ($type) {
            case 'youtubeVideoCategories':
                $args['value'] = LookupResultYoutubeVideoCategories::jsonDeserialize($data);
                break;
            case 'youtubePlaylists':
                $args['value'] = LookupResultYoutubePlaylists::jsonDeserialize($data);
                break;
            case 'tiktokCreator':
                $args['value'] = LookupResultTiktokCreator::jsonDeserialize($data);
                break;
            case 'linkedinOrganizations':
                $args['value'] = LookupResultLinkedinOrganizations::jsonDeserialize($data);
                break;
            case '_unknown':
            default:
                $args['type'] = '_unknown';
                $args['value'] = $data;
        }

        // @phpstan-ignore-next-line
        return new static($args);
    }
}
