<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class UploadTarget extends JsonSerializableType
{
    /**
     * @var (
     *    'single'
     *   |'multipart'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    UploadTargetSingle
     *   |UploadTargetMultipart
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'single'
     *   |'multipart'
     *   |'_unknown'
     * ),
     *   value: (
     *    UploadTargetSingle
     *   |UploadTargetMultipart
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
     * @param UploadTargetSingle $single
     * @return UploadTarget
     */
    public static function single(UploadTargetSingle $single): UploadTarget
    {
        return new UploadTarget([
            'type' => 'single',
            'value' => $single,
        ]);
    }

    /**
     * @param UploadTargetMultipart $multipart
     * @return UploadTarget
     */
    public static function multipart(UploadTargetMultipart $multipart): UploadTarget
    {
        return new UploadTarget([
            'type' => 'multipart',
            'value' => $multipart,
        ]);
    }

    /**
     * @return bool
     */
    public function isSingle(): bool
    {
        return $this->value instanceof UploadTargetSingle && $this->type === 'single';
    }

    /**
     * @return UploadTargetSingle
     */
    public function asSingle(): UploadTargetSingle
    {
        if (!($this->value instanceof UploadTargetSingle && $this->type === 'single')) {
            throw new Exception(
                "Expected single; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isMultipart(): bool
    {
        return $this->value instanceof UploadTargetMultipart && $this->type === 'multipart';
    }

    /**
     * @return UploadTargetMultipart
     */
    public function asMultipart(): UploadTargetMultipart
    {
        if (!($this->value instanceof UploadTargetMultipart && $this->type === 'multipart')) {
            throw new Exception(
                "Expected multipart; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'single':
                $value = $this->asSingle()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'multipart':
                $value = $this->asMultipart()->jsonSerialize();
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
            case 'single':
                $args['value'] = UploadTargetSingle::jsonDeserialize($data);
                break;
            case 'multipart':
                $args['value'] = UploadTargetMultipart::jsonDeserialize($data);
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
