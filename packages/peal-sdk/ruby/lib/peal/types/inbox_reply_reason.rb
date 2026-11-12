# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InboxReplyReason
      extend Peal::Internal::Types::Enum

      CHANNEL_UNAVAILABLE = "channelUnavailable"
      RECONNECT_NEEDED = "reconnectNeeded"
      RATE_LIMITED = "rateLimited"
      PLATFORM_UNAVAILABLE = "platformUnavailable"
      COMMENT_GONE = "commentGone"
      REFUSED = "refused"
      NOT_SENT = "notSent"
      TOO_LONG = "tooLong"
      NO_RESPONSE = "noResponse"
      INTERRUPTED = "interrupted"
      ADAPTER_FAILURE = "adapterFailure"
    end
  end
end
