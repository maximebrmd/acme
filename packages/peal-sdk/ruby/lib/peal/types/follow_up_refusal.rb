# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FollowUpRefusal
      extend Peal::Internal::Types::Enum

      NO_ACTION = "noAction"
      EMPTY_COMMENT = "emptyComment"
      POST_CANCELLED = "postCancelled"
      NO_CHANNEL = "noChannel"
      CHANNELS = "channels"
    end
  end
end
