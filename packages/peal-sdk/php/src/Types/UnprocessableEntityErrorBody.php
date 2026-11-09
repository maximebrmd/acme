<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class UnprocessableEntityErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'UnsupportedMediaType'
     *   |'MediaTooLarge'
     *   |'AltTextTooLong'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    UnsupportedMediaTypeEncoded
     *   |MediaTooLargeEncoded
     *   |AltTextTooLongEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'UnsupportedMediaType'
     *   |'MediaTooLarge'
     *   |'AltTextTooLong'
     *   |'_unknown'
     * ),
     *   value: (
     *    UnsupportedMediaTypeEncoded
     *   |MediaTooLargeEncoded
     *   |AltTextTooLongEncoded
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
     * @param UnsupportedMediaTypeEncoded $unsupportedMediaType
     * @return UnprocessableEntityErrorBody
     */
    public static function unsupportedMediaType(UnsupportedMediaTypeEncoded $unsupportedMediaType): UnprocessableEntityErrorBody
    {
        return new UnprocessableEntityErrorBody([
            'type' => 'UnsupportedMediaType',
            'value' => $unsupportedMediaType,
        ]);
    }

    /**
     * @param MediaTooLargeEncoded $mediaTooLarge
     * @return UnprocessableEntityErrorBody
     */
    public static function mediaTooLarge(MediaTooLargeEncoded $mediaTooLarge): UnprocessableEntityErrorBody
    {
        return new UnprocessableEntityErrorBody([
            'type' => 'MediaTooLarge',
            'value' => $mediaTooLarge,
        ]);
    }

    /**
     * @param AltTextTooLongEncoded $altTextTooLong
     * @return UnprocessableEntityErrorBody
     */
    public static function altTextTooLong(AltTextTooLongEncoded $altTextTooLong): UnprocessableEntityErrorBody
    {
        return new UnprocessableEntityErrorBody([
            'type' => 'AltTextTooLong',
            'value' => $altTextTooLong,
        ]);
    }

    /**
     * @return bool
     */
    public function isUnsupportedMediaType(): bool
    {
        return $this->value instanceof UnsupportedMediaTypeEncoded && $this->type === 'UnsupportedMediaType';
    }

    /**
     * @return UnsupportedMediaTypeEncoded
     */
    public function asUnsupportedMediaType(): UnsupportedMediaTypeEncoded
    {
        if (!($this->value instanceof UnsupportedMediaTypeEncoded && $this->type === 'UnsupportedMediaType')) {
            throw new Exception(
                "Expected UnsupportedMediaType; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isMediaTooLarge(): bool
    {
        return $this->value instanceof MediaTooLargeEncoded && $this->type === 'MediaTooLarge';
    }

    /**
     * @return MediaTooLargeEncoded
     */
    public function asMediaTooLarge(): MediaTooLargeEncoded
    {
        if (!($this->value instanceof MediaTooLargeEncoded && $this->type === 'MediaTooLarge')) {
            throw new Exception(
                "Expected MediaTooLarge; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isAltTextTooLong(): bool
    {
        return $this->value instanceof AltTextTooLongEncoded && $this->type === 'AltTextTooLong';
    }

    /**
     * @return AltTextTooLongEncoded
     */
    public function asAltTextTooLong(): AltTextTooLongEncoded
    {
        if (!($this->value instanceof AltTextTooLongEncoded && $this->type === 'AltTextTooLong')) {
            throw new Exception(
                "Expected AltTextTooLong; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'UnsupportedMediaType':
                $value = $this->asUnsupportedMediaType()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'MediaTooLarge':
                $value = $this->asMediaTooLarge()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'AltTextTooLong':
                $value = $this->asAltTextTooLong()->jsonSerialize();
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
            case 'UnsupportedMediaType':
                $args['value'] = UnsupportedMediaTypeEncoded::jsonDeserialize($data);
                break;
            case 'MediaTooLarge':
                $args['value'] = MediaTooLargeEncoded::jsonDeserialize($data);
                break;
            case 'AltTextTooLong':
                $args['value'] = AltTextTooLongEncoded::jsonDeserialize($data);
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
