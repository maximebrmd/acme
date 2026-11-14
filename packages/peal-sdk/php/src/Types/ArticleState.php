<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class ArticleState extends JsonSerializableType
{
    /**
     * @var (
     *    'draft'
     *   |'scheduled'
     *   |'publishing'
     *   |'published'
     *   |'failed'
     *   |'unconfirmed'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    ArticleStateDraft
     *   |ArticleStateScheduled
     *   |ArticleStatePublishing
     *   |ArticleStatePublished
     *   |ArticleStateFailed
     *   |ArticleStateUnconfirmed
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'draft'
     *   |'scheduled'
     *   |'publishing'
     *   |'published'
     *   |'failed'
     *   |'unconfirmed'
     *   |'_unknown'
     * ),
     *   value: (
     *    ArticleStateDraft
     *   |ArticleStateScheduled
     *   |ArticleStatePublishing
     *   |ArticleStatePublished
     *   |ArticleStateFailed
     *   |ArticleStateUnconfirmed
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
     * @param ArticleStateDraft $draft
     * @return ArticleState
     */
    public static function draft(ArticleStateDraft $draft): ArticleState
    {
        return new ArticleState([
            'type' => 'draft',
            'value' => $draft,
        ]);
    }

    /**
     * @param ArticleStateScheduled $scheduled
     * @return ArticleState
     */
    public static function scheduled(ArticleStateScheduled $scheduled): ArticleState
    {
        return new ArticleState([
            'type' => 'scheduled',
            'value' => $scheduled,
        ]);
    }

    /**
     * @param ArticleStatePublishing $publishing
     * @return ArticleState
     */
    public static function publishing(ArticleStatePublishing $publishing): ArticleState
    {
        return new ArticleState([
            'type' => 'publishing',
            'value' => $publishing,
        ]);
    }

    /**
     * @param ArticleStatePublished $published
     * @return ArticleState
     */
    public static function published(ArticleStatePublished $published): ArticleState
    {
        return new ArticleState([
            'type' => 'published',
            'value' => $published,
        ]);
    }

    /**
     * @param ArticleStateFailed $failed
     * @return ArticleState
     */
    public static function failed(ArticleStateFailed $failed): ArticleState
    {
        return new ArticleState([
            'type' => 'failed',
            'value' => $failed,
        ]);
    }

    /**
     * @param ArticleStateUnconfirmed $unconfirmed
     * @return ArticleState
     */
    public static function unconfirmed(ArticleStateUnconfirmed $unconfirmed): ArticleState
    {
        return new ArticleState([
            'type' => 'unconfirmed',
            'value' => $unconfirmed,
        ]);
    }

    /**
     * @return bool
     */
    public function isDraft(): bool
    {
        return $this->value instanceof ArticleStateDraft && $this->type === 'draft';
    }

    /**
     * @return ArticleStateDraft
     */
    public function asDraft(): ArticleStateDraft
    {
        if (!($this->value instanceof ArticleStateDraft && $this->type === 'draft')) {
            throw new Exception(
                "Expected draft; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isScheduled(): bool
    {
        return $this->value instanceof ArticleStateScheduled && $this->type === 'scheduled';
    }

    /**
     * @return ArticleStateScheduled
     */
    public function asScheduled(): ArticleStateScheduled
    {
        if (!($this->value instanceof ArticleStateScheduled && $this->type === 'scheduled')) {
            throw new Exception(
                "Expected scheduled; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPublishing(): bool
    {
        return $this->value instanceof ArticleStatePublishing && $this->type === 'publishing';
    }

    /**
     * @return ArticleStatePublishing
     */
    public function asPublishing(): ArticleStatePublishing
    {
        if (!($this->value instanceof ArticleStatePublishing && $this->type === 'publishing')) {
            throw new Exception(
                "Expected publishing; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPublished(): bool
    {
        return $this->value instanceof ArticleStatePublished && $this->type === 'published';
    }

    /**
     * @return ArticleStatePublished
     */
    public function asPublished(): ArticleStatePublished
    {
        if (!($this->value instanceof ArticleStatePublished && $this->type === 'published')) {
            throw new Exception(
                "Expected published; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isFailed(): bool
    {
        return $this->value instanceof ArticleStateFailed && $this->type === 'failed';
    }

    /**
     * @return ArticleStateFailed
     */
    public function asFailed(): ArticleStateFailed
    {
        if (!($this->value instanceof ArticleStateFailed && $this->type === 'failed')) {
            throw new Exception(
                "Expected failed; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isUnconfirmed(): bool
    {
        return $this->value instanceof ArticleStateUnconfirmed && $this->type === 'unconfirmed';
    }

    /**
     * @return ArticleStateUnconfirmed
     */
    public function asUnconfirmed(): ArticleStateUnconfirmed
    {
        if (!($this->value instanceof ArticleStateUnconfirmed && $this->type === 'unconfirmed')) {
            throw new Exception(
                "Expected unconfirmed; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'draft':
                $value = $this->asDraft()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'scheduled':
                $value = $this->asScheduled()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'publishing':
                $value = $this->asPublishing()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'published':
                $value = $this->asPublished()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'failed':
                $value = $this->asFailed()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'unconfirmed':
                $value = $this->asUnconfirmed()->jsonSerialize();
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
            case 'draft':
                $args['value'] = ArticleStateDraft::jsonDeserialize($data);
                break;
            case 'scheduled':
                $args['value'] = ArticleStateScheduled::jsonDeserialize($data);
                break;
            case 'publishing':
                $args['value'] = ArticleStatePublishing::jsonDeserialize($data);
                break;
            case 'published':
                $args['value'] = ArticleStatePublished::jsonDeserialize($data);
                break;
            case 'failed':
                $args['value'] = ArticleStateFailed::jsonDeserialize($data);
                break;
            case 'unconfirmed':
                $args['value'] = ArticleStateUnconfirmed::jsonDeserialize($data);
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
