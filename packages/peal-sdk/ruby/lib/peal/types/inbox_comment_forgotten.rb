# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InboxCommentForgotten
      extend Peal::Internal::Types::Enum

      EXPIRED = "expired"
    end
  end
end
