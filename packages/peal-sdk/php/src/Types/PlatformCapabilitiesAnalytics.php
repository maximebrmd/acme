<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PlatformCapabilitiesAnalytics extends JsonSerializableType
{
    /**
     * @var array<value-of<PlatformCapabilitiesAnalyticsAccountNumbersItem>> $accountNumbers
     */
    #[JsonProperty('accountNumbers'), ArrayType(['string'])]
    public array $accountNumbers;

    /**
     * @var bool $perPost
     */
    #[JsonProperty('perPost')]
    public bool $perPost;

    /**
     * @var array<value-of<PlatformCapabilitiesAnalyticsPostCountsItem>> $postCounts
     */
    #[JsonProperty('postCounts'), ArrayType(['string'])]
    public array $postCounts;

    /**
     * @param array{
     *   accountNumbers: array<value-of<PlatformCapabilitiesAnalyticsAccountNumbersItem>>,
     *   perPost: bool,
     *   postCounts: array<value-of<PlatformCapabilitiesAnalyticsPostCountsItem>>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->accountNumbers = $values['accountNumbers'];
        $this->perPost = $values['perPost'];
        $this->postCounts = $values['postCounts'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
