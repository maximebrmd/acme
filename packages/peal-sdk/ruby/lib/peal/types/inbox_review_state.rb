# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InboxReviewState
      extend Peal::Internal::Types::Enum

      NEW = "new"
      ANSWERED = "answered"
    end
  end
end
