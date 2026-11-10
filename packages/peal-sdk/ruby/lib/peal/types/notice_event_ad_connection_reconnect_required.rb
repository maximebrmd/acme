# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventAdConnectionReconnectRequired < Internal::Types::Model
      field :network, -> { String }, optional: false, nullable: false
    end
  end
end
