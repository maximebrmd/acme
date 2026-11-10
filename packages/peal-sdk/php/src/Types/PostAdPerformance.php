<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PostAdPerformance extends JsonSerializableType
{
    /**
     * @var array<Boost> $boosts
     */
    #[JsonProperty('boosts'), ArrayType([Boost::class])]
    public array $boosts;

    /**
     * @var array<OrganicCounts> $organic
     */
    #[JsonProperty('organic'), ArrayType([OrganicCounts::class])]
    public array $organic;

    /**
     * @var array<PostAdPerformancePaidItem> $paid
     */
    #[JsonProperty('paid'), ArrayType([PostAdPerformancePaidItem::class])]
    public array $paid;

    /**
     * @param array{
     *   boosts: array<Boost>,
     *   organic: array<OrganicCounts>,
     *   paid: array<PostAdPerformancePaidItem>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->boosts = $values['boosts'];
        $this->organic = $values['organic'];
        $this->paid = $values['paid'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
