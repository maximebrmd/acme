# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventMessagesTurnedOff < Internal::Types::Model
      field :channel, -> { Peal::Types::NoticeChannel }, optional: false, nullable: false
    end
  end
end
