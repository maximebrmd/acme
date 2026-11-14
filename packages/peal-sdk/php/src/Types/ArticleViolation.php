<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class ArticleViolation extends JsonSerializableType
{
    /**
     * @var (
     *    'titleMissing'
     *   |'titleTooLong'
     *   |'bodyMissing'
     *   |'bodyInvalid'
     *   |'excerptTooLong'
     *   |'tooManyTerms'
     *   |'termInvalid'
     *   |'siteTimeInPast'
     *   |'timeInPast'
     *   |'coverNotImage'
     *   |'approvalRequired'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    ArticleViolationTitleMissing
     *   |ArticleViolationTitleTooLong
     *   |ArticleViolationBodyMissing
     *   |ArticleViolationBodyInvalid
     *   |ArticleViolationExcerptTooLong
     *   |ArticleViolationTooManyTerms
     *   |ArticleViolationTermInvalid
     *   |ArticleViolationSiteTimeInPast
     *   |ArticleViolationTimeInPast
     *   |ArticleViolationCoverNotImage
     *   |ArticleViolationApprovalRequired
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'titleMissing'
     *   |'titleTooLong'
     *   |'bodyMissing'
     *   |'bodyInvalid'
     *   |'excerptTooLong'
     *   |'tooManyTerms'
     *   |'termInvalid'
     *   |'siteTimeInPast'
     *   |'timeInPast'
     *   |'coverNotImage'
     *   |'approvalRequired'
     *   |'_unknown'
     * ),
     *   value: (
     *    ArticleViolationTitleMissing
     *   |ArticleViolationTitleTooLong
     *   |ArticleViolationBodyMissing
     *   |ArticleViolationBodyInvalid
     *   |ArticleViolationExcerptTooLong
     *   |ArticleViolationTooManyTerms
     *   |ArticleViolationTermInvalid
     *   |ArticleViolationSiteTimeInPast
     *   |ArticleViolationTimeInPast
     *   |ArticleViolationCoverNotImage
     *   |ArticleViolationApprovalRequired
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
     * @param ArticleViolationTitleMissing $titleMissing
     * @return ArticleViolation
     */
    public static function titleMissing(ArticleViolationTitleMissing $titleMissing): ArticleViolation
    {
        return new ArticleViolation([
            'type' => 'titleMissing',
            'value' => $titleMissing,
        ]);
    }

    /**
     * @param ArticleViolationTitleTooLong $titleTooLong
     * @return ArticleViolation
     */
    public static function titleTooLong(ArticleViolationTitleTooLong $titleTooLong): ArticleViolation
    {
        return new ArticleViolation([
            'type' => 'titleTooLong',
            'value' => $titleTooLong,
        ]);
    }

    /**
     * @param ArticleViolationBodyMissing $bodyMissing
     * @return ArticleViolation
     */
    public static function bodyMissing(ArticleViolationBodyMissing $bodyMissing): ArticleViolation
    {
        return new ArticleViolation([
            'type' => 'bodyMissing',
            'value' => $bodyMissing,
        ]);
    }

    /**
     * @param ArticleViolationBodyInvalid $bodyInvalid
     * @return ArticleViolation
     */
    public static function bodyInvalid(ArticleViolationBodyInvalid $bodyInvalid): ArticleViolation
    {
        return new ArticleViolation([
            'type' => 'bodyInvalid',
            'value' => $bodyInvalid,
        ]);
    }

    /**
     * @param ArticleViolationExcerptTooLong $excerptTooLong
     * @return ArticleViolation
     */
    public static function excerptTooLong(ArticleViolationExcerptTooLong $excerptTooLong): ArticleViolation
    {
        return new ArticleViolation([
            'type' => 'excerptTooLong',
            'value' => $excerptTooLong,
        ]);
    }

    /**
     * @param ArticleViolationTooManyTerms $tooManyTerms
     * @return ArticleViolation
     */
    public static function tooManyTerms(ArticleViolationTooManyTerms $tooManyTerms): ArticleViolation
    {
        return new ArticleViolation([
            'type' => 'tooManyTerms',
            'value' => $tooManyTerms,
        ]);
    }

    /**
     * @param ArticleViolationTermInvalid $termInvalid
     * @return ArticleViolation
     */
    public static function termInvalid(ArticleViolationTermInvalid $termInvalid): ArticleViolation
    {
        return new ArticleViolation([
            'type' => 'termInvalid',
            'value' => $termInvalid,
        ]);
    }

    /**
     * @param ArticleViolationSiteTimeInPast $siteTimeInPast
     * @return ArticleViolation
     */
    public static function siteTimeInPast(ArticleViolationSiteTimeInPast $siteTimeInPast): ArticleViolation
    {
        return new ArticleViolation([
            'type' => 'siteTimeInPast',
            'value' => $siteTimeInPast,
        ]);
    }

    /**
     * @param ArticleViolationTimeInPast $timeInPast
     * @return ArticleViolation
     */
    public static function timeInPast(ArticleViolationTimeInPast $timeInPast): ArticleViolation
    {
        return new ArticleViolation([
            'type' => 'timeInPast',
            'value' => $timeInPast,
        ]);
    }

    /**
     * @param ArticleViolationCoverNotImage $coverNotImage
     * @return ArticleViolation
     */
    public static function coverNotImage(ArticleViolationCoverNotImage $coverNotImage): ArticleViolation
    {
        return new ArticleViolation([
            'type' => 'coverNotImage',
            'value' => $coverNotImage,
        ]);
    }

    /**
     * @param ArticleViolationApprovalRequired $approvalRequired
     * @return ArticleViolation
     */
    public static function approvalRequired(ArticleViolationApprovalRequired $approvalRequired): ArticleViolation
    {
        return new ArticleViolation([
            'type' => 'approvalRequired',
            'value' => $approvalRequired,
        ]);
    }

    /**
     * @return bool
     */
    public function isTitleMissing(): bool
    {
        return $this->value instanceof ArticleViolationTitleMissing && $this->type === 'titleMissing';
    }

    /**
     * @return ArticleViolationTitleMissing
     */
    public function asTitleMissing(): ArticleViolationTitleMissing
    {
        if (!($this->value instanceof ArticleViolationTitleMissing && $this->type === 'titleMissing')) {
            throw new Exception(
                "Expected titleMissing; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTitleTooLong(): bool
    {
        return $this->value instanceof ArticleViolationTitleTooLong && $this->type === 'titleTooLong';
    }

    /**
     * @return ArticleViolationTitleTooLong
     */
    public function asTitleTooLong(): ArticleViolationTitleTooLong
    {
        if (!($this->value instanceof ArticleViolationTitleTooLong && $this->type === 'titleTooLong')) {
            throw new Exception(
                "Expected titleTooLong; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isBodyMissing(): bool
    {
        return $this->value instanceof ArticleViolationBodyMissing && $this->type === 'bodyMissing';
    }

    /**
     * @return ArticleViolationBodyMissing
     */
    public function asBodyMissing(): ArticleViolationBodyMissing
    {
        if (!($this->value instanceof ArticleViolationBodyMissing && $this->type === 'bodyMissing')) {
            throw new Exception(
                "Expected bodyMissing; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isBodyInvalid(): bool
    {
        return $this->value instanceof ArticleViolationBodyInvalid && $this->type === 'bodyInvalid';
    }

    /**
     * @return ArticleViolationBodyInvalid
     */
    public function asBodyInvalid(): ArticleViolationBodyInvalid
    {
        if (!($this->value instanceof ArticleViolationBodyInvalid && $this->type === 'bodyInvalid')) {
            throw new Exception(
                "Expected bodyInvalid; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isExcerptTooLong(): bool
    {
        return $this->value instanceof ArticleViolationExcerptTooLong && $this->type === 'excerptTooLong';
    }

    /**
     * @return ArticleViolationExcerptTooLong
     */
    public function asExcerptTooLong(): ArticleViolationExcerptTooLong
    {
        if (!($this->value instanceof ArticleViolationExcerptTooLong && $this->type === 'excerptTooLong')) {
            throw new Exception(
                "Expected excerptTooLong; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTooManyTerms(): bool
    {
        return $this->value instanceof ArticleViolationTooManyTerms && $this->type === 'tooManyTerms';
    }

    /**
     * @return ArticleViolationTooManyTerms
     */
    public function asTooManyTerms(): ArticleViolationTooManyTerms
    {
        if (!($this->value instanceof ArticleViolationTooManyTerms && $this->type === 'tooManyTerms')) {
            throw new Exception(
                "Expected tooManyTerms; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTermInvalid(): bool
    {
        return $this->value instanceof ArticleViolationTermInvalid && $this->type === 'termInvalid';
    }

    /**
     * @return ArticleViolationTermInvalid
     */
    public function asTermInvalid(): ArticleViolationTermInvalid
    {
        if (!($this->value instanceof ArticleViolationTermInvalid && $this->type === 'termInvalid')) {
            throw new Exception(
                "Expected termInvalid; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isSiteTimeInPast(): bool
    {
        return $this->value instanceof ArticleViolationSiteTimeInPast && $this->type === 'siteTimeInPast';
    }

    /**
     * @return ArticleViolationSiteTimeInPast
     */
    public function asSiteTimeInPast(): ArticleViolationSiteTimeInPast
    {
        if (!($this->value instanceof ArticleViolationSiteTimeInPast && $this->type === 'siteTimeInPast')) {
            throw new Exception(
                "Expected siteTimeInPast; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTimeInPast(): bool
    {
        return $this->value instanceof ArticleViolationTimeInPast && $this->type === 'timeInPast';
    }

    /**
     * @return ArticleViolationTimeInPast
     */
    public function asTimeInPast(): ArticleViolationTimeInPast
    {
        if (!($this->value instanceof ArticleViolationTimeInPast && $this->type === 'timeInPast')) {
            throw new Exception(
                "Expected timeInPast; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isCoverNotImage(): bool
    {
        return $this->value instanceof ArticleViolationCoverNotImage && $this->type === 'coverNotImage';
    }

    /**
     * @return ArticleViolationCoverNotImage
     */
    public function asCoverNotImage(): ArticleViolationCoverNotImage
    {
        if (!($this->value instanceof ArticleViolationCoverNotImage && $this->type === 'coverNotImage')) {
            throw new Exception(
                "Expected coverNotImage; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isApprovalRequired(): bool
    {
        return $this->value instanceof ArticleViolationApprovalRequired && $this->type === 'approvalRequired';
    }

    /**
     * @return ArticleViolationApprovalRequired
     */
    public function asApprovalRequired(): ArticleViolationApprovalRequired
    {
        if (!($this->value instanceof ArticleViolationApprovalRequired && $this->type === 'approvalRequired')) {
            throw new Exception(
                "Expected approvalRequired; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'titleMissing':
                $value = $this->asTitleMissing()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'titleTooLong':
                $value = $this->asTitleTooLong()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'bodyMissing':
                $value = $this->asBodyMissing()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'bodyInvalid':
                $value = $this->asBodyInvalid()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'excerptTooLong':
                $value = $this->asExcerptTooLong()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'tooManyTerms':
                $value = $this->asTooManyTerms()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'termInvalid':
                $value = $this->asTermInvalid()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'siteTimeInPast':
                $value = $this->asSiteTimeInPast()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'timeInPast':
                $value = $this->asTimeInPast()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'coverNotImage':
                $value = $this->asCoverNotImage()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'approvalRequired':
                $value = $this->asApprovalRequired()->jsonSerialize();
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
            case 'titleMissing':
                $args['value'] = ArticleViolationTitleMissing::jsonDeserialize($data);
                break;
            case 'titleTooLong':
                $args['value'] = ArticleViolationTitleTooLong::jsonDeserialize($data);
                break;
            case 'bodyMissing':
                $args['value'] = ArticleViolationBodyMissing::jsonDeserialize($data);
                break;
            case 'bodyInvalid':
                $args['value'] = ArticleViolationBodyInvalid::jsonDeserialize($data);
                break;
            case 'excerptTooLong':
                $args['value'] = ArticleViolationExcerptTooLong::jsonDeserialize($data);
                break;
            case 'tooManyTerms':
                $args['value'] = ArticleViolationTooManyTerms::jsonDeserialize($data);
                break;
            case 'termInvalid':
                $args['value'] = ArticleViolationTermInvalid::jsonDeserialize($data);
                break;
            case 'siteTimeInPast':
                $args['value'] = ArticleViolationSiteTimeInPast::jsonDeserialize($data);
                break;
            case 'timeInPast':
                $args['value'] = ArticleViolationTimeInPast::jsonDeserialize($data);
                break;
            case 'coverNotImage':
                $args['value'] = ArticleViolationCoverNotImage::jsonDeserialize($data);
                break;
            case 'approvalRequired':
                $args['value'] = ArticleViolationApprovalRequired::jsonDeserialize($data);
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
