<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class RateCardMeters extends JsonSerializableType
{
    /**
     * @var MeterTerms $assistantImages
     */
    #[JsonProperty('assistantImages')]
    public MeterTerms $assistantImages;

    /**
     * @var MeterTerms $assistantRequests
     */
    #[JsonProperty('assistantRequests')]
    public MeterTerms $assistantRequests;

    /**
     * @var MeterTerms $managedAds
     */
    #[JsonProperty('managedAds')]
    public MeterTerms $managedAds;

    /**
     * @var MeterTerms $outboundMessages
     */
    #[JsonProperty('outboundMessages')]
    public MeterTerms $outboundMessages;

    /**
     * @var MeterTerms $xApi
     */
    #[JsonProperty('xApi')]
    public MeterTerms $xApi;

    /**
     * @param array{
     *   assistantImages: MeterTerms,
     *   assistantRequests: MeterTerms,
     *   managedAds: MeterTerms,
     *   outboundMessages: MeterTerms,
     *   xApi: MeterTerms,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->assistantImages = $values['assistantImages'];
        $this->assistantRequests = $values['assistantRequests'];
        $this->managedAds = $values['managedAds'];
        $this->outboundMessages = $values['outboundMessages'];
        $this->xApi = $values['xApi'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
