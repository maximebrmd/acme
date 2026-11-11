<?php

namespace Peal\Webhooks\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\WebhookRedeliveryByIds;
use Peal\Types\WebhookRedeliveryOfFailed;

class RedeliverManyWebhooksRequest extends JsonSerializableType
{
    /**
     * @var (
     *    WebhookRedeliveryByIds
     *   |WebhookRedeliveryOfFailed
     * ) $body
     */
    public WebhookRedeliveryByIds|WebhookRedeliveryOfFailed $body;

    /**
     * @param array{
     *   body: (
     *    WebhookRedeliveryByIds
     *   |WebhookRedeliveryOfFailed
     * ),
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->body = $values['body'];
    }
}
