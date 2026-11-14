# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module CommentRuleRefusal
      extend Peal::Internal::Types::Enum

      KEYWORDS = "keywords"
      EMPTY_REPLY = "emptyReply"
      NO_CHANNEL = "noChannel"
      CHANNELS = "channels"
    end
  end
end
