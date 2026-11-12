<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class BadGatewayErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'AssistantFailed'
     *   |'ImageProviderRefused'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    AssistantFailedEncoded
     *   |ImageProviderRefusedEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'AssistantFailed'
     *   |'ImageProviderRefused'
     *   |'_unknown'
     * ),
     *   value: (
     *    AssistantFailedEncoded
     *   |ImageProviderRefusedEncoded
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
     * @param AssistantFailedEncoded $assistantFailed
     * @return BadGatewayErrorBody
     */
    public static function assistantFailed(AssistantFailedEncoded $assistantFailed): BadGatewayErrorBody
    {
        return new BadGatewayErrorBody([
            'type' => 'AssistantFailed',
            'value' => $assistantFailed,
        ]);
    }

    /**
     * @param ImageProviderRefusedEncoded $imageProviderRefused
     * @return BadGatewayErrorBody
     */
    public static function imageProviderRefused(ImageProviderRefusedEncoded $imageProviderRefused): BadGatewayErrorBody
    {
        return new BadGatewayErrorBody([
            'type' => 'ImageProviderRefused',
            'value' => $imageProviderRefused,
        ]);
    }

    /**
     * @return bool
     */
    public function isAssistantFailed(): bool
    {
        return $this->value instanceof AssistantFailedEncoded && $this->type === 'AssistantFailed';
    }

    /**
     * @return AssistantFailedEncoded
     */
    public function asAssistantFailed(): AssistantFailedEncoded
    {
        if (!($this->value instanceof AssistantFailedEncoded && $this->type === 'AssistantFailed')) {
            throw new Exception(
                "Expected AssistantFailed; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isImageProviderRefused(): bool
    {
        return $this->value instanceof ImageProviderRefusedEncoded && $this->type === 'ImageProviderRefused';
    }

    /**
     * @return ImageProviderRefusedEncoded
     */
    public function asImageProviderRefused(): ImageProviderRefusedEncoded
    {
        if (!($this->value instanceof ImageProviderRefusedEncoded && $this->type === 'ImageProviderRefused')) {
            throw new Exception(
                "Expected ImageProviderRefused; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'AssistantFailed':
                $value = $this->asAssistantFailed()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'ImageProviderRefused':
                $value = $this->asImageProviderRefused()->jsonSerialize();
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
            case 'AssistantFailed':
                $args['value'] = AssistantFailedEncoded::jsonDeserialize($data);
                break;
            case 'ImageProviderRefused':
                $args['value'] = ImageProviderRefusedEncoded::jsonDeserialize($data);
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
