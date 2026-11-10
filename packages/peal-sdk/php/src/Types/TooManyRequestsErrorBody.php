<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class TooManyRequestsErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'TooManyWebhookSends'
     *   |'TooManyRequests'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    TooManyWebhookSendsEncoded
     *   |TooManyRequestsEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'TooManyWebhookSends'
     *   |'TooManyRequests'
     *   |'_unknown'
     * ),
     *   value: (
     *    TooManyWebhookSendsEncoded
     *   |TooManyRequestsEncoded
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
     * @param TooManyWebhookSendsEncoded $tooManyWebhookSends
     * @return TooManyRequestsErrorBody
     */
    public static function tooManyWebhookSends(TooManyWebhookSendsEncoded $tooManyWebhookSends): TooManyRequestsErrorBody
    {
        return new TooManyRequestsErrorBody([
            'type' => 'TooManyWebhookSends',
            'value' => $tooManyWebhookSends,
        ]);
    }

    /**
     * @param TooManyRequestsEncoded $tooManyRequests
     * @return TooManyRequestsErrorBody
     */
    public static function tooManyRequests(TooManyRequestsEncoded $tooManyRequests): TooManyRequestsErrorBody
    {
        return new TooManyRequestsErrorBody([
            'type' => 'TooManyRequests',
            'value' => $tooManyRequests,
        ]);
    }

    /**
     * @return bool
     */
    public function isTooManyWebhookSends(): bool
    {
        return $this->value instanceof TooManyWebhookSendsEncoded && $this->type === 'TooManyWebhookSends';
    }

    /**
     * @return TooManyWebhookSendsEncoded
     */
    public function asTooManyWebhookSends(): TooManyWebhookSendsEncoded
    {
        if (!($this->value instanceof TooManyWebhookSendsEncoded && $this->type === 'TooManyWebhookSends')) {
            throw new Exception(
                "Expected TooManyWebhookSends; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTooManyRequests(): bool
    {
        return $this->value instanceof TooManyRequestsEncoded && $this->type === 'TooManyRequests';
    }

    /**
     * @return TooManyRequestsEncoded
     */
    public function asTooManyRequests(): TooManyRequestsEncoded
    {
        if (!($this->value instanceof TooManyRequestsEncoded && $this->type === 'TooManyRequests')) {
            throw new Exception(
                "Expected TooManyRequests; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'TooManyWebhookSends':
                $value = $this->asTooManyWebhookSends()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'TooManyRequests':
                $value = $this->asTooManyRequests()->jsonSerialize();
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
            case 'TooManyWebhookSends':
                $args['value'] = TooManyWebhookSendsEncoded::jsonDeserialize($data);
                break;
            case 'TooManyRequests':
                $args['value'] = TooManyRequestsEncoded::jsonDeserialize($data);
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
