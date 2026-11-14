# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InboxOutgoingMessageReason
      extend Peal::Internal::Types::Enum

      CHANNEL_UNAVAILABLE = "channelUnavailable"
      RECONNECT_NEEDED = "reconnectNeeded"
      RATE_LIMITED = "rateLimited"
      PLATFORM_UNAVAILABLE = "platformUnavailable"
      CONVERSATION_GONE = "conversationGone"
      REFUSED = "refused"
      NOT_SENT = "notSent"
      NO_RESPONSE = "noResponse"
      INTERRUPTED = "interrupted"
      ADAPTER_FAILURE = "adapterFailure"
    end
  end
end
