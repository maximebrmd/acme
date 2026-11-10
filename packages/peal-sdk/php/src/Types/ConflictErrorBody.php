<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class ConflictErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'PostNotReviewable'
     *   |'TooManyReviewLinks'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    PostNotReviewableEncoded
     *   |TooManyReviewLinksEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'PostNotReviewable'
     *   |'TooManyReviewLinks'
     *   |'_unknown'
     * ),
     *   value: (
     *    PostNotReviewableEncoded
     *   |TooManyReviewLinksEncoded
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
     * @param PostNotReviewableEncoded $postNotReviewable
     * @return ConflictErrorBody
     */
    public static function postNotReviewable(PostNotReviewableEncoded $postNotReviewable): ConflictErrorBody
    {
        return new ConflictErrorBody([
            'type' => 'PostNotReviewable',
            'value' => $postNotReviewable,
        ]);
    }

    /**
     * @param TooManyReviewLinksEncoded $tooManyReviewLinks
     * @return ConflictErrorBody
     */
    public static function tooManyReviewLinks(TooManyReviewLinksEncoded $tooManyReviewLinks): ConflictErrorBody
    {
        return new ConflictErrorBody([
            'type' => 'TooManyReviewLinks',
            'value' => $tooManyReviewLinks,
        ]);
    }

    /**
     * @return bool
     */
    public function isPostNotReviewable(): bool
    {
        return $this->value instanceof PostNotReviewableEncoded && $this->type === 'PostNotReviewable';
    }

    /**
     * @return PostNotReviewableEncoded
     */
    public function asPostNotReviewable(): PostNotReviewableEncoded
    {
        if (!($this->value instanceof PostNotReviewableEncoded && $this->type === 'PostNotReviewable')) {
            throw new Exception(
                "Expected PostNotReviewable; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTooManyReviewLinks(): bool
    {
        return $this->value instanceof TooManyReviewLinksEncoded && $this->type === 'TooManyReviewLinks';
    }

    /**
     * @return TooManyReviewLinksEncoded
     */
    public function asTooManyReviewLinks(): TooManyReviewLinksEncoded
    {
        if (!($this->value instanceof TooManyReviewLinksEncoded && $this->type === 'TooManyReviewLinks')) {
            throw new Exception(
                "Expected TooManyReviewLinks; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'PostNotReviewable':
                $value = $this->asPostNotReviewable()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'TooManyReviewLinks':
                $value = $this->asTooManyReviewLinks()->jsonSerialize();
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
            case 'PostNotReviewable':
                $args['value'] = PostNotReviewableEncoded::jsonDeserialize($data);
                break;
            case 'TooManyReviewLinks':
                $args['value'] = TooManyReviewLinksEncoded::jsonDeserialize($data);
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
