<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PricesMeters extends JsonSerializableType
{
    /**
     * @var UnitPrice $assistantImages
     */
    #[JsonProperty('assistantImages')]
    public UnitPrice $assistantImages;

    /**
     * @var UnitPrice $assistantRequests
     */
    #[JsonProperty('assistantRequests')]
    public UnitPrice $assistantRequests;

    /**
     * @var UnitPrice $managedAds
     */
    #[JsonProperty('managedAds')]
    public UnitPrice $managedAds;

    /**
     * @var UnitPrice $outboundMessages
     */
    #[JsonProperty('outboundMessages')]
    public UnitPrice $outboundMessages;

    /**
     * @var UnitPrice $xApi
     */
    #[JsonProperty('xApi')]
    public UnitPrice $xApi;

    /**
     * @param array{
     *   assistantImages: UnitPrice,
     *   assistantRequests: UnitPrice,
     *   managedAds: UnitPrice,
     *   outboundMessages: UnitPrice,
     *   xApi: UnitPrice,
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
